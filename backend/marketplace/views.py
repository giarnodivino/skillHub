from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Booking, JobRequest, Quote
from .serializers import (
    BookingSerializer,
    JobRequestSerializer,
    QuoteActionSerializer,
    QuoteSerializer,
    ReviewSerializer,
)


User = get_user_model()


def can_access_job(user, job):
    return (
        user.id == job.customer_id
        or user.id == job.contractor_id
        or Quote.objects.filter(job=job, contractor=user).exists()
        or (
            user.role == User.Role.CONTRACTOR
            and job.contractor_id is None
            and job.status in (JobRequest.Status.REQUESTED, JobRequest.Status.QUOTED)
        )
    )


class JobRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = JobRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = (
            JobRequest.objects.select_related("customer", "contractor")
            .prefetch_related("quotes", "quotes__contractor")
            .order_by("-updated_at")
        )

        if user.role == User.Role.CUSTOMER:
            return queryset.filter(customer=user)

        if user.role == User.Role.CONTRACTOR:
            return queryset.filter(
                Q(contractor=user)
                | Q(contractor__isnull=True, status__in=[JobRequest.Status.REQUESTED, JobRequest.Status.QUOTED])
                | Q(quotes__contractor=user)
            ).distinct()

        return queryset


class JobRequestDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = JobRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = JobRequest.objects.select_related("customer", "contractor").prefetch_related(
        "quotes",
        "quotes__contractor",
    )

    def get_object(self):
        job = super().get_object()
        if not can_access_job(self.request.user, job):
            raise PermissionDenied("You do not have access to this job.")
        return job

    def perform_update(self, serializer):
        job = self.get_object()
        if self.request.user.id != job.customer_id:
            raise PermissionDenied("Only the customer can update this job.")
        serializer.save()


class QuoteListCreateView(generics.ListCreateAPIView):
    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_job(self):
        job = get_object_or_404(JobRequest, pk=self.kwargs["job_pk"])
        if not can_access_job(self.request.user, job):
            raise PermissionDenied("You do not have access to this job.")
        return job

    def get_queryset(self):
        job = self.get_job()
        user = self.request.user
        queryset = Quote.objects.filter(job=job).select_related("contractor")

        if user.id == job.customer_id or user.role == User.Role.ADMIN:
            return queryset

        return queryset.filter(contractor=user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["job"] = self.get_job()
        return context


class QuoteActionView(generics.GenericAPIView):
    serializer_class = QuoteActionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        quote = get_object_or_404(Quote.objects.select_related("job", "contractor"), pk=kwargs["pk"])
        serializer = self.get_serializer(data=request.data, context={"request": request, "quote": quote})
        serializer.is_valid(raise_exception=True)
        quote = serializer.save()
        return Response(QuoteSerializer(quote, context={"request": request}).data)


class BookingListView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related(
            "job",
            "quote",
            "customer",
            "contractor",
        ).prefetch_related("review")

        if user.role == User.Role.ADMIN:
            return queryset

        return queryset.filter(Q(customer=user) | Q(contractor=user))


class BookingDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Booking.objects.select_related("job", "quote", "customer", "contractor")

    def get_object(self):
        booking = super().get_object()
        if self.request.user.id not in (booking.customer_id, booking.contractor_id) and self.request.user.role != User.Role.ADMIN:
            raise PermissionDenied("You do not have access to this booking.")
        return booking


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_booking(self):
        booking = get_object_or_404(Booking, pk=self.kwargs["booking_pk"])
        if self.request.user.id not in (booking.customer_id, booking.contractor_id):
            raise PermissionDenied("You do not have access to this booking.")
        return booking

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["booking"] = self.get_booking()
        return context

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return Response(response.data, status=status.HTTP_201_CREATED)
