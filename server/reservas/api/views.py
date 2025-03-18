from datetime import datetime

from django.contrib.auth import authenticate
from knox.auth import TokenAuthentication
from knox.models import AuthToken
from knox.settings import CONSTANTS
from knox.views import LoginView as KnoxLoginView, LogoutView as KnoxLogoutView
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin, CreateModelMixin
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ViewSet, ReadOnlyModelViewSet

import reservas.api.serializers as serializers
import reservas.models as models
from reservas.authentication import BasicAuthentication


class LoginViewSet(GenericViewSet):
    authentication_classes = [BasicAuthentication]
    permission_classes = [AllowAny]
    serializer_class = serializers.LoginSerializer

    knox = KnoxLoginView()

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.knox.post(request, *args, **kwargs)


class LogoutViewSet(ViewSet):
    authentication_classes = [TokenAuthentication]
    knox = KnoxLogoutView()

    def create(self, request, *args, **kwargs):
        return self.knox.post(request, *args, **kwargs)


class RegisterViewSet(CreateModelMixin, GenericViewSet):
    permission_classes = [AllowAny]
    queryset = models.Usuario.objects.all()
    serializer_class = serializers.RegisterSerializer


class ConfirmEmailViewSet(GenericViewSet, RetrieveModelMixin):
    permission_classes = [AllowAny]
    queryset = models.TokenVerificacion.objects.all()

    def retrieve(self, request, *args, **kwargs):
        token = self.get_object()
        from django.core.exceptions import ValidationError
        try:
            token.confirm()
        except ValidationError:
            return Response({"result": "failed", "error": "Confirmation code expired"})
        return Response({"result": "success"})


class TokenViewSet(GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = serializers.TokenSerializer

    def get_data(self, expiry):
        if expiry is None:
            return {"valid": False}

        valid = expiry > datetime.now(expiry.tzinfo)
        if not valid:
            expiry = None
        return {
            "valid": valid,
            "expiry": expiry
        }

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        expiry = None
        try:
            expiry = AuthToken.objects.get(token_key=token[:CONSTANTS.TOKEN_KEY_LENGTH]).expiry
        except Exception:
            pass
        return Response(self.get_data(expiry))


class AulaViewSet(ReadOnlyModelViewSet):
    queryset = models.Aula.objects.all()
    serializer_class = serializers.AulaSerializer
    permission_classes = [AllowAny]

    @action(methods=['get'], detail=True, )
    def reservas(self, request, pk):
        aula = models.Aula.objects.get(pk=pk)
        fecha = None
        if "fecha" in request.query_params:
            fecha = request.query_params["fecha"]
        reservas = aula.get_reservas(fecha)
        serializer = serializers.ReservaFieldSerializer(instance=reservas, many=True)
        return Response(serializer.data)


class EstablecimientoViewSet(ReadOnlyModelViewSet):
    queryset = models.Establecimiento.objects.all()
    serializer_class = serializers.EstablecimientoSerializer


class EquipamientoAulaViewSet(ReadOnlyModelViewSet):
    queryset = models.EquipamientoAula.objects.all()
    serializer_class = serializers.EquipamientoAulaSerializer


class EquipamientoDisponibleViewSet(ReadOnlyModelViewSet):
    queryset = models.Equipamiento.objects.all()
    serializer_class = serializers.EquipamientoSerializer


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = models.Reserva.objects.all()
    serializer_class = serializers.ReservaSerializer

    def get_queryset(self):
        user = self.request.user
        return models.Reserva.objects.filter(solicitante=user)


# TODO: No terminado
class ReservaExterna(viewsets.GenericViewSet, CreateModelMixin):
    serializer_class = serializers.ReservaExternaSerializer

    def create(self, request, *args, **kwargs):
        print(request.data)
        return super(CreateModelMixin).create(request, *args, **kwargs)
