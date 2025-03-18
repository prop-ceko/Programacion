from datetime import datetime, timezone, date, time, timedelta
import uuid
from typing import Optional

from django.contrib.auth.models import User, Group, AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import UniqueConstraint, Q
from django.utils.translation import gettext_lazy as _

from feriados.feriados import fetch
from reservas.email import send_confirmation_successful_email
# from reservas.email import send_email, send_confirmation_email, send_confirmation_successful_email
from reservas.managers import UserManager
from reservas.settings import MAX_LARGO_NOMBRES, RESERVA_HORARIO_MINIMO, RESERVA_HORARIO_MAXIMO
from the_project import settings

# Create your models here.
Group.add_to_class('prioridad', models.PositiveIntegerField(default=0))

TIPOS_USUARIO = {
    1: "Alumno",
    2: "Docente"
}


class Usuario(AbstractUser):
    username = None
    email = models.EmailField(_("email address"), unique=True)
    dni = models.PositiveIntegerField(unique=True)
    first_name = models.CharField(_("first name"), max_length=MAX_LARGO_NOMBRES)
    last_name = models.CharField(_("last name"), max_length=MAX_LARGO_NOMBRES)
    verified = models.BooleanField(_("verified"), default=False)
    tipo = models.IntegerField(_("type"), choices=TIPOS_USUARIO)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['dni']

    def __str__(self):
        return self.email


class TokenVerificacion(models.Model):
    token = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    expiracion = models.DateTimeField()

    def confirm(self):
        self.delete()

        if self.expiracion < datetime.now(timezone.utc):
            raise ValidationError("El código caducó")

        self.usuario.verified = True
        self.usuario.save()

        send_confirmation_successful_email(self.usuario.email, self.usuario.first_name, self.usuario.last_name)

    def __str__(self):
        return f'{self.token}: {self.usuario}. Válido hasta {self.expiracion}'


class Establecimiento(models.Model):
    nombre = models.CharField(max_length=MAX_LARGO_NOMBRES)
    direccion = models.CharField(max_length=100, verbose_name="dirección")

    def __str__(self):
        return self.nombre


class Edificio(models.Model):
    nombre = models.CharField(max_length=MAX_LARGO_NOMBRES)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.nombre} en {self.establecimiento}"


class Aula(models.Model):
    nombre = models.CharField(max_length=MAX_LARGO_NOMBRES)
    capacidad = models.PositiveIntegerField()
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE, blank=True, null=True)
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, blank=True, null=True, default=None)
    es_laboratorio = models.BooleanField(default=False)

    def clean(self):
        if self.edificio is None and self.establecimiento is None:
            raise ValidationError("Establece edificio o establecimiento")
        if self.edificio is not None:
            self.establecimiento = self.edificio.establecimiento

    def get_reservas(self, fecha: Optional[datetime.date] = None):
        if fecha is None:
            fecha = date.today()
        return Reserva.objects.filter(aula=self, fecha=fecha)

    def disponible(self, ahora=False, fecha: Optional[datetime.date] = None,
                   desde: Optional[datetime.time] = None, hasta: Optional[datetime.time] = None):
        if ahora:
            ahora = datetime.now()
            fecha = ahora.date()
            desde = hasta = ahora.time()

        reservas_en_el_mismo_horario = Reserva.objects.filter(aula=self, fecha=fecha, desde__lt=hasta, hasta__gt=desde)
        return reservas_en_el_mismo_horario.exists()

    def __str__(self):
        return f"{self.nombre} en {self.establecimiento}"

    class Meta:
        constraints = [
            UniqueConstraint(name="No puede haber dos aulas con el mismo nombre en un establecimiento",
                             fields=("nombre", "establecimiento"))
        ]


class EquipamientoAula(models.Model):
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE, related_name="equipamiento")
    nombre = models.CharField(max_length=MAX_LARGO_NOMBRES)
    cantidad = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.aula}: {self.nombre} x{self.cantidad}"


class Equipamiento(models.Model):
    nombre = models.CharField(max_length=MAX_LARGO_NOMBRES, unique=True)
    cantidad = models.PositiveIntegerField()

    def consultar_reservas(self, ahora=False, fecha: Optional[datetime.date] = None,
                           desde: Optional[datetime.time] = None, hasta: Optional[datetime.time] = None):
        if ahora:
            ahora = datetime.now()
            fecha = ahora.date()
            desde = hasta = ahora.time()

        query = ReservaEquipamiento.objects.filter(equipamiento=self, reserva__fecha=fecha, reserva__desde__lt=hasta,
                                                   reserva__hasta__gt=desde)
        return query

    def consultar_disponibilidad(self, ahora=False, fecha: Optional[datetime.date] = None,
                                 desde: Optional[datetime.time] = None, hasta: Optional[datetime.time] = None):
        reservas = self.consultar_reservas(ahora, fecha, desde, hasta)
        cantidad = 0
        for reserva in reservas:
            cantidad += reserva.cantidad
        return self.cantidad - cantidad

    def __str__(self):
        return f"{self.nombre} x{self.cantidad}"


class Reserva(models.Model):
    aula = models.ForeignKey(Aula, on_delete=models.CASCADE)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    fecha = models.DateField()
    desde = models.TimeField()
    hasta = models.TimeField()
    creacion = models.DateTimeField(auto_now_add=True, verbose_name="creación")
    modificacion = models.DateTimeField(auto_now=True, verbose_name="modificación")

    def __str__(self):
        return f"Aula {self.aula}. {self.fecha} de {self.desde} a {self.hasta}"

    def obtener_equipamiento(self, id):
        try:
            return self.equipamiento.get(equipamiento__id=id)
        except ReservaEquipamiento.DoesNotExist:
            return None


class ReservaEquipamiento(models.Model):
    reserva = models.ForeignKey(Reserva, on_delete=models.CASCADE, related_name='equipamiento')
    equipamiento = models.ForeignKey(Equipamiento, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    def __str__(self):
        return f"{self.equipamiento.nombre} x{self.cantidad}"


DIAS_DE_LA_SEMANA = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo"
}


class DiaHabil(models.Model):
    dia_de_la_semana = models.IntegerField(choices=DIAS_DE_LA_SEMANA)

    @staticmethod
    def es_dia_habil(dia: date):
        return DiaHabil.objects.filter(dia_de_la_semana=dia.isoweekday()).exists()


class FechaProhibida(models.Model):
    descripcion = models.CharField(max_length=MAX_LARGO_NOMBRES, null=True, blank=True)
    desde = models.DateTimeField()
    hasta = models.DateTimeField()

    @staticmethod
    def puede_reservar(dia: date = None, desde: datetime = None, hasta: datetime = None):
        if dia is None and desde is None and hasta is None:
            # Averiguar para hoy
            dia = date.today()
        if dia is not None:
            # Averiguar para el día indicado
            import pytz
            desde = datetime.combine(dia, time(0, 0, 0), tzinfo=pytz.UTC)
            hasta = desde + timedelta(days=1)
        if desde is not None and hasta is not None:
            fechas_prohibidas = FechaProhibida.objects.all().filter(desde__gt=hasta, hasta__lt=desde)
            return fechas_prohibidas.exists()

    @staticmethod
    def cargar_feriados():
        feriados = fetch(date.today().year)
        for feriado in feriados:
            FechaProhibida.objects.get_or_create(descripcion=feriado.name, desde=feriado.desde, hasta=feriado.hasta)
