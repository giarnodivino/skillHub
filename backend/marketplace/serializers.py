from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from accounts.serializers import ContractorSerializer
from chat.serializers import ChatUserSerializer
from .models import Booking, JobRequest, Quote, Review


User = get_user_model()


def is_approved_contractor(user):
    return (
        user.role == User.Role.CONTRACTOR
        and user.is_active
        and user.contractor_verification_status
        == User.ContractorVerificationStatus.APPROVED
    )


class QuoteSerializer(serializers.ModelSerializer):
    contractor = ContractorSerializer(read_only=True)

    class Meta:
        model = Quote
        fields = (
            "id",
            "job",
            "contractor",
            "price",
            "message",
            "estimated_duration",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "job",
            "contractor",
            "status",
            "created_at",
            "updated_at",
        )

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quote price must be greater than zero.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        job = self.context.get("job")

        if not request or not is_approved_contractor(request.user):
            raise serializers.ValidationError("Only approved contractors can send quotes.")

        if job.status in (JobRequest.Status.ACCEPTED, JobRequest.Status.IN_PROGRESS, JobRequest.Status.COMPLETED, JobRequest.Status.CANCELLED):
            raise serializers.ValidationError("This job is not accepting quotes.")

        if job.contractor_id and job.contractor_id != request.user.id:
            raise serializers.ValidationError("This job request was sent to another contractor.")

        if Quote.objects.filter(job=job, contractor=request.user).exists():
            raise serializers.ValidationError("You have already quoted this job.")

        return attrs

    def create(self, validated_data):
        job = self.context["job"]
        request = self.context["request"]
        quote = Quote.objects.create(job=job, contractor=request.user, **validated_data)
        if job.status == JobRequest.Status.REQUESTED:
            job.status = JobRequest.Status.QUOTED
            job.save(update_fields=["status", "updated_at"])
        return quote


class ReviewSerializer(serializers.ModelSerializer):
    customer = ChatUserSerializer(read_only=True)
    contractor = ContractorSerializer(read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "booking",
            "customer",
            "contractor",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = ("id", "booking", "customer", "contractor", "created_at")

    def validate(self, attrs):
        request = self.context.get("request")
        booking = self.context.get("booking")

        if not request or request.user.id != booking.customer_id:
            raise serializers.ValidationError("Only the customer can review this booking.")

        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError("You can only review completed bookings.")

        if hasattr(booking, "review"):
            raise serializers.ValidationError("This booking has already been reviewed.")

        return attrs

    def create(self, validated_data):
        booking = self.context["booking"]
        return Review.objects.create(
            booking=booking,
            customer=booking.customer,
            contractor=booking.contractor,
            **validated_data,
        )


class BookingSerializer(serializers.ModelSerializer):
    customer = ChatUserSerializer(read_only=True)
    contractor = ContractorSerializer(read_only=True)
    quote = QuoteSerializer(read_only=True)
    review = ReviewSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "job",
            "quote",
            "customer",
            "contractor",
            "scheduled_for",
            "status",
            "review",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "job",
            "quote",
            "customer",
            "contractor",
            "created_at",
            "updated_at",
        )

    def validate_status(self, value):
        request = self.context.get("request")
        booking = self.instance

        if not request or not booking:
            return value

        if booking.status in (Booking.Status.COMPLETED, Booking.Status.CANCELLED):
            raise serializers.ValidationError("Completed or cancelled bookings cannot be changed.")

        if value == Booking.Status.IN_PROGRESS and request.user.id != booking.contractor_id:
            raise serializers.ValidationError("Only the contractor can start the job.")

        if value == Booking.Status.COMPLETED and request.user.id not in (
            booking.customer_id,
            booking.contractor_id,
        ):
            raise serializers.ValidationError("Only booking participants can complete the job.")

        if value == Booking.Status.CANCELLED and request.user.id not in (
            booking.customer_id,
            booking.contractor_id,
        ):
            raise serializers.ValidationError("Only booking participants can cancel the job.")

        return value

    def update(self, instance, validated_data):
        booking = super().update(instance, validated_data)
        if booking.status == Booking.Status.IN_PROGRESS:
            booking.job.status = JobRequest.Status.IN_PROGRESS
            booking.job.save(update_fields=["status", "updated_at"])
        elif booking.status == Booking.Status.COMPLETED:
            booking.job.status = JobRequest.Status.COMPLETED
            booking.job.save(update_fields=["status", "updated_at"])
        elif booking.status == Booking.Status.CANCELLED:
            booking.job.status = JobRequest.Status.CANCELLED
            booking.job.save(update_fields=["status", "updated_at"])
        return booking


class JobRequestSerializer(serializers.ModelSerializer):
    customer = ChatUserSerializer(read_only=True)
    contractor = ContractorSerializer(read_only=True)
    contractor_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    quotes = QuoteSerializer(many=True, read_only=True)
    booking = BookingSerializer(read_only=True)

    class Meta:
        model = JobRequest
        fields = (
            "id",
            "customer",
            "contractor",
            "contractor_id",
            "title",
            "category",
            "description",
            "location",
            "budget",
            "preferred_start",
            "status",
            "quotes",
            "booking",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "customer",
            "contractor",
            "status",
            "quotes",
            "booking",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")

        if self.instance is None and request and request.user.role != User.Role.CUSTOMER:
            raise serializers.ValidationError("Only customers can create job requests.")

        contractor_id = attrs.pop("contractor_id", None)
        if contractor_id:
            try:
                contractor = User.objects.get(pk=contractor_id)
            except User.DoesNotExist as exc:
                raise serializers.ValidationError({"contractor_id": "Contractor was not found."}) from exc

            if not is_approved_contractor(contractor):
                raise serializers.ValidationError({"contractor_id": "This contractor is not available for hire."})

            attrs["contractor"] = contractor

        return attrs

    def validate_budget(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Budget must be greater than zero.")
        return value

    def create(self, validated_data):
        return JobRequest.objects.create(customer=self.context["request"].user, **validated_data)


class QuoteActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "decline", "withdraw"])
    scheduled_for = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        request = self.context["request"]
        quote = self.context["quote"]

        if quote.status != Quote.Status.PENDING:
            raise serializers.ValidationError("Only pending quotes can be changed.")

        if attrs["action"] == "accept" and request.user.id != quote.job.customer_id:
            raise serializers.ValidationError("Only the customer can accept a quote.")

        if attrs["action"] == "decline" and request.user.id != quote.job.customer_id:
            raise serializers.ValidationError("Only the customer can decline a quote.")

        if attrs["action"] == "withdraw" and request.user.id != quote.contractor_id:
            raise serializers.ValidationError("Only the contractor can withdraw a quote.")

        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        quote = self.context["quote"]
        action = self.validated_data["action"]

        if action == "accept":
            quote.status = Quote.Status.ACCEPTED
            quote.save(update_fields=["status", "updated_at"])
            Quote.objects.filter(job=quote.job).exclude(pk=quote.pk).update(status=Quote.Status.DECLINED)
            quote.job.status = JobRequest.Status.ACCEPTED
            quote.job.contractor = quote.contractor
            quote.job.save(update_fields=["status", "contractor", "updated_at"])
            Booking.objects.create(
                job=quote.job,
                quote=quote,
                customer=quote.job.customer,
                contractor=quote.contractor,
                scheduled_for=self.validated_data.get("scheduled_for"),
            )
        elif action == "decline":
            quote.status = Quote.Status.DECLINED
            quote.save(update_fields=["status", "updated_at"])
        else:
            quote.status = Quote.Status.WITHDRAWN
            quote.save(update_fields=["status", "updated_at"])

        return quote
