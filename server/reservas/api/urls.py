from django.urls import path, include
from rest_framework import routers

from reservas.api import views

router = routers.DefaultRouter()
router.register(r'aulas', views.AulaViewSet)
router.register(r'establecimientos', views.EstablecimientoViewSet)
router.register(r'equipamiento', views.EquipamientoDisponibleViewSet)
router.register(r'reservas', views.ReservaViewSet)
router.register(r'reservar_externo', views.ReservaExterna, basename="reservar_externo")
# TODO
router.register(r'login', views.LoginViewSet, basename="login")
router.register(r'logout', views.LogoutViewSet, basename="logout")
router.register(r'register', views.RegisterViewSet, basename="register")
router.register(r'confirm_email', views.ConfirmEmailViewSet, basename="confirm_email")
router.register(r'token', views.TokenViewSet, basename="token")

urlpatterns = [
    path('', include(router.urls)),
]
