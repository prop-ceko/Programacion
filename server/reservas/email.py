from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models.signals import post_save
from django.dispatch import receiver


def send_email(recipient, text_content, html_content=None):
    msg = EmailMultiAlternatives(
        "Reservas - Confirmación de email",
        text_content,
        settings.EMAIL_HOST_USER,
        [recipient]
    )

    # Lastly, attach the HTML content to the email instance and send.
    if html_content:
        msg.attach_alternative(html_content, "text/html")
    msg.send()


def send_confirmation_email(recipient, confirmation_link):
    # First, render the plain text content.
    text = ('Es necesario que confirmes la dirección de tu correo electrónico antes de continuar. Entra a este '
            'enlace para confirmar tu email: {0}').format(confirmation_link)

    # Secondly, render the HTML content.
    html = ('Es necesario que confirmes la dirección de tu correo electrónico antes de continuar. <a href="{'
            '0}">Haz clic aquí para confirmar tu email</a>').format(confirmation_link)

    send_email(recipient, text, html)


def send_confirmation_successful_email(recipient, first_name, last_name):
    text = f'Bienvenido, {first_name} {last_name}. Tu usuario ha sido confirmado correctamente.'
    send_email(recipient, text)


def send_reset_password_email(recipient):
    pass


def send_password_reset_successful_email(recipient):
    pass


def send_reservation_email(recipient, aula, fecha, desde, hasta):
    text = f'Reservaste correctamente {aula} para el día {fecha} desde las {desde} hasta las {hasta}.'
    send_email(recipient, text)
