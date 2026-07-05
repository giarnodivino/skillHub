from django.urls import path
from .views import healthz, test_api

urlpatterns = [
    path('healthz/', healthz, name='healthz'),
    path('test/', test_api, name='test_api'),
]
