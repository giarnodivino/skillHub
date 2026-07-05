from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Booking, JobRequest, Quote, Review


User = get_user_model()


class MarketplaceApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            first_name="Casey",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )
        self.contractor = User.objects.create_user(
            email="contractor@example.com",
            password="StrongPass123",
            first_name="Connie",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=True,
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        )
        self.pending_contractor = User.objects.create_user(
            email="pending@example.com",
            password="StrongPass123",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        )

    def authenticate(self, user):
        response = self.client.post(
            "/api/accounts/token/",
            {"email": user.email, "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def create_job(self, contractor_id=None):
        self.authenticate(self.customer)
        payload = {
            "title": "Repair kitchen sink",
            "category": "Plumbing",
            "description": "The sink is leaking under the cabinet.",
            "location": "Makati",
            "latitude": "14.554700",
            "longitude": "121.024400",
            "budget": "2500.00",
        }
        if contractor_id:
            payload["contractor_id"] = contractor_id
        return self.client.post(reverse("job-list"), payload, format="json")

    def test_customer_can_create_job_request(self):
        response = self.create_job(contractor_id=self.contractor.id)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(JobRequest.objects.count(), 1)
        job = JobRequest.objects.get()
        self.assertEqual(job.customer, self.customer)
        self.assertEqual(job.contractor, self.contractor)
        self.assertEqual(job.latitude, Decimal("14.554700"))
        self.assertEqual(job.longitude, Decimal("121.024400"))
        self.assertEqual(job.status, JobRequest.Status.REQUESTED)

    def test_contractor_cannot_create_job_request(self):
        self.authenticate(self.contractor)
        response = self.client.post(
            reverse("job-list"),
            {
                "title": "Need work",
                "description": "This should not be allowed.",
                "location": "Quezon City",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(JobRequest.objects.count(), 0)

    def test_job_cannot_target_pending_contractor(self):
        response = self.create_job(contractor_id=self.pending_contractor.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(JobRequest.objects.count(), 0)

    def test_approved_contractor_can_quote_job(self):
        job_response = self.create_job()
        job_id = job_response.data["id"]
        self.authenticate(self.contractor)

        response = self.client.post(
            reverse("quote-list", kwargs={"job_pk": job_id}),
            {
                "price": "1800.00",
                "message": "I can handle this tomorrow.",
                "estimated_duration": "2 hours",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Quote.objects.count(), 1)
        job = JobRequest.objects.get(pk=job_id)
        self.assertEqual(job.status, JobRequest.Status.QUOTED)

    def test_customer_accepting_quote_creates_booking(self):
        job_response = self.create_job()
        job = JobRequest.objects.get(pk=job_response.data["id"])
        quote = Quote.objects.create(
            job=job,
            contractor=self.contractor,
            price="1800.00",
            message="Ready to go.",
        )

        self.authenticate(self.customer)
        response = self.client.post(
            reverse("quote-action", kwargs={"pk": quote.id}),
            {"action": "accept"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        quote.refresh_from_db()
        job.refresh_from_db()
        self.assertEqual(quote.status, Quote.Status.ACCEPTED)
        self.assertEqual(job.status, JobRequest.Status.ACCEPTED)
        self.assertEqual(Booking.objects.count(), 1)
        booking = Booking.objects.get()
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.contractor, self.contractor)

        list_response = self.client.get(reverse("job-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["booking"]["id"], booking.id)

    def test_customer_can_review_completed_booking(self):
        job = JobRequest.objects.create(
            customer=self.customer,
            contractor=self.contractor,
            title="Patch drywall",
            description="Small wall patch.",
            location="Pasig",
            status=JobRequest.Status.COMPLETED,
        )
        quote = Quote.objects.create(
            job=job,
            contractor=self.contractor,
            price="1200.00",
            status=Quote.Status.ACCEPTED,
        )
        booking = Booking.objects.create(
            job=job,
            quote=quote,
            customer=self.customer,
            contractor=self.contractor,
            status=Booking.Status.COMPLETED,
        )

        self.authenticate(self.customer)
        response = self.client.post(
            reverse("review-create", kwargs={"booking_pk": booking.id}),
            {"rating": 5, "comment": "Fast and clean work."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

    def test_cannot_review_before_booking_is_completed(self):
        job = JobRequest.objects.create(
            customer=self.customer,
            contractor=self.contractor,
            title="Install shelf",
            description="Wall shelf install.",
            location="Taguig",
            status=JobRequest.Status.ACCEPTED,
        )
        quote = Quote.objects.create(
            job=job,
            contractor=self.contractor,
            price="900.00",
            status=Quote.Status.ACCEPTED,
        )
        booking = Booking.objects.create(
            job=job,
            quote=quote,
            customer=self.customer,
            contractor=self.contractor,
        )

        self.authenticate(self.customer)
        response = self.client.post(
            reverse("review-create", kwargs={"booking_pk": booking.id}),
            {"rating": 5, "comment": "Not done yet."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.count(), 0)
