from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _

from reservas.models import Aula, Edificio, EquipamientoAula, Equipamiento, Establecimiento, Reserva, \
    ReservaEquipamiento, Usuario

# Register your models here.
for model in (Aula, Edificio, EquipamientoAula, Equipamiento, ReservaEquipamiento, Establecimiento):
    admin.site.register(model)


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    readonly_fields = ('creacion', 'modificacion')


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "dni")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {'fields': ('email', 'password1', 'password2')}),
        (
            _("Personal info"),
            {
                'classes': ('wide',),
                'fields': ('first_name', 'last_name', 'dni'),
            },
        ),
    )
    readonly_fields = ('last_login', 'date_joined')
    ordering = ('id',)
    list_display = ("email", "first_name", "last_name", "is_staff")
    search_fields = ("email", "first_name", "last_name")
