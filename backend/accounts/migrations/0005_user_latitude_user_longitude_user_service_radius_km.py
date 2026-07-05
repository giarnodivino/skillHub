from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_alter_user_government_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="latitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                validators=[MinValueValidator(-90), MaxValueValidator(90)],
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                validators=[MinValueValidator(-180), MaxValueValidator(180)],
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="service_radius_km",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                validators=[MinValueValidator(1), MaxValueValidator(500)],
            ),
        ),
    ]
