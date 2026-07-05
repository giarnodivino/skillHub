import mimetypes
from pathlib import Path

from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from rest_framework import generics, permissions
from rest_framework.views import APIView

from .location import haversine_distance_km, parse_coordinate, parse_positive_decimal
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
        queryset = User.objects.filter(
            role=User.Role.CONTRACTOR,
            is_active=True,
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        ).order_by("first_name", "last_name", "email")

        latitude = parse_coordinate(self.request.query_params.get("lat"), -90, 90)
        longitude = parse_coordinate(self.request.query_params.get("lng"), -180, 180)
        search_radius = parse_positive_decimal(self.request.query_params.get("radius_km"))

        if latitude is None or longitude is None:
            return queryset

        if search_radius is None:
            search_radius = 25

        nearby_contractors = []
        for contractor in queryset:
            if contractor.latitude is None or contractor.longitude is None:
                continue

            distance = haversine_distance_km(
                latitude,
                longitude,
                contractor.latitude,
                contractor.longitude,
            )
            contractor_radius = contractor.service_radius_km
            if distance <= float(search_radius) and (
                contractor_radius is None or distance <= float(contractor_radius)
            ):
                contractor._distance_km = distance
                nearby_contractors.append(contractor)

        return sorted(nearby_contractors, key=lambda contractor: contractor._distance_km)


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


class ContractorGovernmentIdView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        contractor = generics.get_object_or_404(
            User,
            pk=pk,
            role=User.Role.CONTRACTOR,
        )

        if not contractor.government_id:
            raise Http404("Government ID was not uploaded.")

        filename = Path(contractor.government_id.name).name
        content_type = (
            mimetypes.guess_type(filename)[0] or "application/octet-stream"
        )
        response = FileResponse(
            contractor.government_id.open("rb"),
            content_type=content_type,
            as_attachment=False,
            filename=filename,
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
