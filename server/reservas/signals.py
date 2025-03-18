from datetime import datetime, timedelta, timezone
from urllib import parse

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse

from reservas import models
from reservas.email import send_confirmation_email, send_reservation_email


@receiver(post_save, sender=models.Usuario, created=True)
def user_created(sender, instance: models.Usuario, **kwargs):
    expiration = datetime.now(timezone.utc) + timedelta(days=1)
    token = models.TokenVerificacion.objects.create(usuario=instance, expiracion=expiration)

    token_path = reverse('confirm_email-detail', kwargs={'pk': token.token})
    confirmation_link = parse.urljoin(settings.SITE_URL, token_path)

    send_confirmation_email(instance.email, confirmation_link)


@receiver(post_save, sender=models.Reserva, created=True)
def reserva_created(sender, instance: models.Reserva, **kwargs):
    send_reservation_email(instance.solicitante, instance.aula, instance.fecha, instance.desde, instance.hasta)
