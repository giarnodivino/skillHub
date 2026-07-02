from django.contrib.auth import get_user_model
from rest_framework import generics, permissions

from .serializers import (
    AdminContractorReviewSerializer,
    ContractorSerializer,
    RegisterSerializer,
    UserSerializer,
)


User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ContractorListView(generics.ListAPIView):
    serializer_class = ContractorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.CONTRACTOR,
            is_active=True,
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        ).order_by("first_name", "last_name", "email")


class PendingContractorListView(generics.ListAPIView):
    serializer_class = AdminContractorReviewSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(
            role=User.Role.CONTRACTOR,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        ).order_by("first_name", "last_name", "email")


class ContractorReviewView(generics.UpdateAPIView):
    serializer_class = AdminContractorReviewSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return User.objects.filter(role=User.Role.CONTRACTOR)
