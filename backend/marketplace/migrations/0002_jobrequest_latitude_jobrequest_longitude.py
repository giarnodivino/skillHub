from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="jobrequest",
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
            model_name="jobrequest",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                max_digits=9,
                null=True,
                validators=[MinValueValidator(-180), MaxValueValidator(180)],
            ),
        ),
    ]
