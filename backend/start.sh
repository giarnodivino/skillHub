#!/bin/sh
set -e

python manage.py collectstatic --noinput
python manage.py migrate

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py shell -c "
from django.contrib.auth import get_user_model

User = get_user_model()
email = '$DJANGO_SUPERUSER_EMAIL'
password = '$DJANGO_SUPERUSER_PASSWORD'

if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password)
    print(f'Created superuser {email}')
else:
    print(f'Superuser {email} already exists')
"
fi

gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
