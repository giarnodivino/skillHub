from django.contrib.auth import get_user_model
from rest_framework import generics, permissions

from .serializers import ContractorSerializer, RegisterSerializer, UserSerializer


User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ContractorListView(generics.ListAPIView):
    serializer_class = ContractorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.CONTRACTOR).order_by("first_name", "last_name", "email")
