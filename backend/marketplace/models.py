from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class JobRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        QUOTED = "quoted", "Quoted"
        ACCEPTED = "accepted", "Accepted"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_requests",
    )
    contractor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="direct_job_requests",
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=160)
    category = models.CharField(max_length=80, blank=True, default="")
    description = models.TextField()
    location = models.CharField(max_length=160)
    budget = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    preferred_start = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class Quote(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        WITHDRAWN = "withdrawn", "Withdrawn"

    job = models.ForeignKey(JobRequest, on_delete=models.CASCADE, related_name="quotes")
    contractor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quotes",
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    message = models.TextField(blank=True, default="")
    estimated_duration = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["job", "contractor"],
                name="unique_quote_per_job_contractor",
            )
        ]
        ordering = ["price", "created_at"]

    def __str__(self):
        return f"Quote {self.id} for job {self.job_id}"


class Booking(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    job = models.OneToOneField(JobRequest, on_delete=models.CASCADE, related_name="booking")
    quote = models.OneToOneField(Quote, on_delete=models.CASCADE, related_name="booking")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_bookings",
    )
    contractor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contractor_bookings",
    )
    scheduled_for = models.DateTimeField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Booking {self.id} for job {self.job_id}"


class Review(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="review")
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )
    contractor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_received",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rating} star review for booking {self.booking_id}"
