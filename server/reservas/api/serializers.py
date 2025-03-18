from collections import OrderedDict, Counter
from datetime import datetime, time, date
from typing import Iterable

from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from knox.models import AuthToken
from rest_framework import serializers

from django.utils.translation import gettext_lazy as _
from rest_framework.fields import empty

from reservas.models import Equipamiento, Establecimiento, EquipamientoAula, Reserva, Aula, Edificio, \
    ReservaEquipamiento, Usuario
from reservas.settings import RESERVA_DURACION_MINIMA, RESERVA_HORARIO_MINIMO, RESERVA_HORARIO_MAXIMO, \
    RESERVA_DURACION_MAXIMA
from reservas.utils import repeated


def differ_from_instance(instance, data: dict, fields: Iterable[str]) -> bool:
    for field in fields:
        if field in data and getattr(instance, field) != data[field]:
            return True
    return False


def update_fields(instance, data, fields: Iterable[str]):
    for field in fields:
        setattr(instance, field, data[field])


def update_if_different(instance, data, fields: Iterable[str]):
    any_changed = False
    for field in fields:
        if getattr(instance, field) != data[field]:
            any_changed = True
            setattr(instance, field, data[field])

    return any_changed


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'},
                                     label=_("Password"))

    class Meta:
        model = Usuario
        fields = ("first_name", "last_name", "dni", "email", "password")

    def validate_dni(self, value: int):
        if value <= 0:
            raise serializers.ValidationError("Debe ser mayor o igual a 1")
        return value

    def validate_first_name(self, value: str):
        return self.capitalize(value)

    def validate_last_name(self, value: str):
        return self.capitalize(value)

    def validate(self, attrs):
        user = Usuario(**attrs)

        # get the password from the data
        password = attrs.get('password')

        errors = dict()
        try:
            validate_password(password=password, user=user)
        except exceptions.ValidationError as e:
            errors['password'] = list(e.messages)

        if errors:
            raise serializers.ValidationError(errors)

        return super().validate(attrs)

    @staticmethod
    def capitalize(value):
        palabras = [palabra.capitalize() for palabra in value.split(" ") if len(palabra) > 1]
        return " ".join(palabras)

    def create(self, validated_data):
        user = Usuario.objects.create_user(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            dni=validated_data['dni'],
            password=validated_data['password']
        )
        return user


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class EquipamientoAulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipamientoAula
        exclude = ('id', 'aula')


class AulaSerializer(serializers.ModelSerializer):
    equipamiento = EquipamientoAulaSerializer(many=True)
    disponible = serializers.SerializerMethodField()

    class Meta:
        model = Aula
        fields = ('id', 'nombre', 'equipamiento', 'disponible')

    @staticmethod
    def get_disponible(aula: Aula):
        return aula.disponible(ahora=True) is None


class AulaFieldSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    nombre = serializers.CharField(required=False)

    class Meta:
        model = Aula
        fields = ('id', 'nombre')

    def validate(self, attrs):
        if "id" not in attrs and "nombre" not in attrs:
            raise serializers.ValidationError("Se requiere el id o el nombre del aula")
        return attrs


class EstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establecimiento
        fields = '__all__'


class EdificioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edificio
        fields = '__all__'


class EquipamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipamiento
        fields = '__all__'


class ReservaEquipamientoSerializer(serializers.ModelSerializer):
    # nombre = serializers.CharField(source="equipamiento.nombre")

    class Meta:
        model = ReservaEquipamiento
        fields = ('equipamiento', 'cantidad')


class ReservaEquipamientoFieldSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="equipamiento.id")
    nombre = serializers.CharField(source="equipamiento.nombre", required=False)

    class Meta:
        model = ReservaEquipamiento
        fields = ('id', 'nombre', 'cantidad')


class ReservaSerializer(serializers.ModelSerializer):
    solicitante = serializers.HiddenField(
        default=serializers.CurrentUserDefault()
    )
    aula = AulaFieldSerializer()
    equipamiento = ReservaEquipamientoFieldSerializer(many=True, required=False, default=[])

    class Meta:
        model = Reserva
        fields = ('id', 'aula', 'fecha', 'desde', 'hasta', 'solicitante', 'equipamiento')

    def create(self, validated_data):
        equipamiento = validated_data.pop("equipamiento")

        reserva = Reserva.objects.create(**validated_data)
        items = [
            ReservaEquipamiento(reserva=reserva, **item)
            for item in equipamiento
        ]

        ReservaEquipamiento.objects.bulk_create(items)
        return reserva

    def save(self, **kwargs):
        return super().save(**kwargs)

    def update(self, reserva: Reserva, validated_data):
        no_encontrado = [equipamiento.id for equipamiento in reserva.equipamiento.all()]

        update_fields(reserva, validated_data, ("aula", "fecha", "desde", "hasta"))
        reserva.save()

        for data in validated_data.get("equipamiento"):
            equipamiento = reserva.obtener_equipamiento(data["equipamiento"].id)
            if equipamiento is None:
                ReservaEquipamiento.objects.create(reserva, **data)
            else:
                equipamiento.cantidad = data['cantidad']
                equipamiento.save()
                no_encontrado.remove(equipamiento.id)

        for id in no_encontrado:
            ReservaEquipamiento.objects.get(id=id).delete()

        return reserva

    @staticmethod
    def validate_desde(value: time):
        if value < RESERVA_HORARIO_MINIMO:
            raise serializers.ValidationError(f"La reserva debe empezar de las {RESERVA_HORARIO_MINIMO} en adelante")
        return value

    @staticmethod
    def validate_hasta(value: time):
        if value > RESERVA_HORARIO_MAXIMO:
            raise serializers.ValidationError(f"La reserva debe terminar a las {RESERVA_HORARIO_MAXIMO} o antes")
        return value

    @staticmethod
    def validate_equipamiento(value: Iterable):
        def get_reserva_equipamiento(item: dict):
            d = OrderedDict()
            d["equipamiento"] = Equipamiento.objects.get(pk=item["equipamiento"]["id"])
            d["cantidad"] = item["cantidad"]
            return d

        if repeated(value, lambda item: item["equipamiento"]["id"]):
            raise serializers.ValidationError(
                "Se detectaron múltiples entradas para algunos equipamientos. "
                "Debe haber una única entrada por equipamiento")

        return [get_reserva_equipamiento(equipamiento) for equipamiento in value]

    def validate_aula(self, value):
        try:
            if "id" in value and "nombre" in value:
                return Aula.objects.get(pk=value["id"], nombre=value["nombre"])
            if "id" in value:
                return Aula.objects.get(pk=value["id"])
            if "nombre" in value:
                return Aula.objects.get(nombre=value["nombre"])
        except Exception:
            pass

        raise serializers.ValidationError("No se encontró el aula con el id y nombre especificados")

    def validate(self, attrs):
        fecha = attrs["fecha"]
        desde = attrs["desde"]
        hasta = attrs["hasta"]
        aula = attrs["aula"]
        equipamiento = attrs.get("equipamiento")

        self.validar_duracion(fecha, desde, hasta)
        self.encontrar_otras_reservas(aula, desde, fecha, hasta)
        self.confirmar_disponibilidad_equipamiento(fecha, desde, hasta, equipamiento)
        return attrs

    def confirmar_disponibilidad_equipamiento(self, fecha, desde, hasta, equipamiento_extra):
        for item in equipamiento_extra:
            equipamiento = item["equipamiento"]
            cantidad_requerida = item["cantidad"]
            if cantidad_requerida > equipamiento.cantidad:
                raise serializers.ValidationError(
                    f"Solo hay {equipamiento.cantidad} {equipamiento.nombre} en toda la universidad.")

            unidades_disponibles = equipamiento.consultar_disponibilidad(fecha=fecha, desde=desde, hasta=hasta)
            if self.instance is not None:
                try:
                    reserva = ReservaEquipamiento.objects.get(reserva=self.instance.id, equipamiento=equipamiento)
                    unidades_disponibles += reserva.cantidad
                except Exception as e:
                    print(type(e))
                    pass
            if cantidad_requerida > unidades_disponibles:
                raise serializers.ValidationError(
                    f"Solo hay {unidades_disponibles} {equipamiento.nombre} disponibles en ese momento.")

    def encontrar_otras_reservas(self, aula, desde, fecha, hasta):
        reserva = aula.disponible(fecha=fecha, desde=desde, hasta=hasta)
        if reserva is not None and (self.instance is None or self.instance.id != reserva.id):
            raise serializers.ValidationError("Ya hay una reserva en ese horario")

    @staticmethod
    def validar_duracion(fecha: date, desde: time, hasta: time):
        duracion = datetime.combine(fecha, hasta) - datetime.combine(fecha, desde)
        if duracion < RESERVA_DURACION_MINIMA:
            raise serializers.ValidationError(f"La reserva debe durar por lo menos {RESERVA_DURACION_MINIMA}")
        if duracion > RESERVA_DURACION_MAXIMA:
            raise serializers.ValidationError(f"La reserva puede durar hasta {RESERVA_DURACION_MAXIMA}")


class ReservaFieldSerializer(serializers.ModelSerializer):
    equipamiento = ReservaEquipamientoSerializer(many=True, required=False, default=[])

    class Meta:
        model = Reserva
        fields = ('id', 'fecha', 'desde', 'hasta', 'equipamiento')


class ReservaExternaSerializer(serializers.Serializer):
    nombre = serializers.CharField(required=True)
    apellido = serializers.CharField(required=True)
    dni = serializers.IntegerField(required=True, min_value=1)
    email = serializers.EmailField(required=True)
    telefono = serializers.CharField(required=True)
    mensaje = serializers.CharField(required=True)
