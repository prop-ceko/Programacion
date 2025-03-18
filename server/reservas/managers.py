from datetime import datetime, timedelta, timezone
from urllib import parse

from django.conf import settings
from django.contrib.auth.models import BaseUserManager
from django.core.mail import EmailMultiAlternatives
from django.urls import reverse

import reservas.models as models
from reservas.email import send_confirmation_email


class UserManager(BaseUserManager):

    def create_user(self, email, dni, password=None, **extra_fields):
        """
        Creates and saves a User with the given email, date of
        birth and password.
        """
        if not email:
            raise ValueError("Users must have an email address")

        user = self.model(
            email=self.normalize_email(email),
            dni=dni
        )

        user.set_password(password)
        user.save(using=self._db)

        # expiration = datetime.now(timezone.utc) + timedelta(days=1)
        # token = models.TokenVerificacion.objects.create(usuario=user, expiracion=expiration)

        # token_url = reverse('confirm_email-detail', kwargs={'pk': token.token})
        # full_url = parse.urljoin(settings.SITE_URL, token_url)
        #
        # print(full_url)
        #
        # send_confirmation_email(email, full_url)
        return user

    def create_superuser(self, email, dni, password=None, **extra_fields):
        """
        Creates and saves a superuser with the given email, date of
        birth and password.
        """
        user = self.model(
            email=self.normalize_email(email),
            dni=dni
        )

        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save(using=self._db)
        return user
