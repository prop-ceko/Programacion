# Generated by Django 4.2.2 on 2023-07-22 00:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0011_reservaequipamientoextra_alter_equipamientoaula_aula_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='establecimiento',
            name='direccion',
            field=models.CharField(max_length=100, verbose_name='dirección'),
        ),
        migrations.AlterField(
            model_name='reserva',
            name='creacion',
            field=models.DateTimeField(auto_now_add=True, verbose_name='creación'),
        ),
        migrations.AlterField(
            model_name='reserva',
            name='modificacion',
            field=models.DateTimeField(auto_now=True, verbose_name='modificación'),
        ),
    ]
