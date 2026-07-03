import shutil
import tempfile
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from marketplace.models import Booking, JobRequest, Quote, Review


User = get_user_model()

TEST_MEDIA_ROOT = tempfile.mkdtemp()
TEST_PRIVATE_MEDIA_ROOT = tempfile.mkdtemp()


def upload_file(name="test.txt", content=b"test file"):
    return SimpleUploadedFile(name, content, content_type="text/plain")


class UserModelTests(APITestCase):
    def test_create_user_with_email(self):
        user = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            first_name="Test",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )

        self.assertEqual(user.email, "customer@example.com")
        self.assertTrue(user.check_password("StrongPass123"))
        self.assertEqual(user.role, User.Role.CUSTOMER)

    def test_create_superuser_defaults_to_admin_role(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123",
        )

        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)


@override_settings(
    MEDIA_ROOT=TEST_MEDIA_ROOT,
    PRIVATE_MEDIA_ROOT=TEST_PRIVATE_MEDIA_ROOT,
)
class AuthApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEST_MEDIA_ROOT, ignore_errors=True)
        shutil.rmtree(TEST_PRIVATE_MEDIA_ROOT, ignore_errors=True)

    def test_register_customer(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "new@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "Customer",
                "role": User.Role.CUSTOMER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["email"], "new@example.com")
        self.assertEqual(
            response.data["contractor_verification_status"],
            User.ContractorVerificationStatus.NOT_REQUIRED,
        )
        self.assertNotIn("password", response.data)

    def test_register_customer_can_upload_optional_profile_picture(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "profile@example.com",
                "password": "StrongPass123",
                "first_name": "Profile",
                "last_name": "Customer",
                "role": User.Role.CUSTOMER,
                "profile_picture": upload_file("profile.jpg"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["profile_picture"])

    def test_register_contractor_requires_review_uploads(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "contractor@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "Contractor",
                "role": User.Role.CONTRACTOR,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("profile_picture", response.data)
        self.assertIn("government_id", response.data)

    def test_register_contractor_sets_pending_inactive_account(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "contractor@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "Contractor",
                "role": User.Role.CONTRACTOR,
                "profile_picture": upload_file("profile.jpg"),
                "government_id": upload_file("government-id.pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.Role.CONTRACTOR)
        self.assertFalse(response.data["is_active"])
        self.assertEqual(
            response.data["contractor_verification_status"],
            User.ContractorVerificationStatus.PENDING,
        )

        contractor = User.objects.get(email="contractor@example.com")
        self.assertFalse(contractor.is_active)
        self.assertTrue(contractor.profile_picture)
        self.assertTrue(contractor.government_id)

    def test_pending_contractor_cannot_login(self):
        User.objects.create_user(
            email="pending@example.com",
            password="StrongPass123",
            first_name="Pending",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        )

        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "pending@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reject_public_admin_registration(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "fake-admin@example.com",
                "password": "StrongPass123",
                "first_name": "Fake",
                "last_name": "Admin",
                "role": User.Role.ADMIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_token_login_and_me_endpoint(self):
        user = User.objects.create_user(
            email="login@example.com",
            password="StrongPass123",
            first_name="Login",
            last_name="User",
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "login@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)
        self.assertIn("refresh", token_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        me_response = self.client.get(reverse("me"))

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["id"], user.id)
        self.assertEqual(me_response.data["email"], "login@example.com")

    def test_authenticated_user_can_update_profile_fields(self):
        user = User.objects.create_user(
            email="profile@example.com",
            password="StrongPass123",
            first_name="Profile",
            last_name="User",
            role=User.Role.CONTRACTOR,
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "profile@example.com", "password": "StrongPass123"},
            format="json",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        response = self.client.patch(
            reverse("me"),
            {
                "bio": "I fix homes and kitchens.",
                "location": "Lagos",
                "hourly_rate": "45.00",
                "services": "Plumbing, Electrical",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.bio, "I fix homes and kitchens.")
        self.assertEqual(user.location, "Lagos")
        self.assertEqual(user.hourly_rate, Decimal("45.00"))
        self.assertEqual(user.services, "Plumbing, Electrical")

    def test_contractors_endpoint_lists_only_contractors(self):
        contractor = User.objects.create_user(
            email="contractor-list@example.com",
            password="StrongPass123",
            first_name="Listed",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            bio="I build clean kitchens and repair cabinets.",
            location="Quezon City",
            hourly_rate="55.00",
            services="Cabinet repair, Kitchen remodeling",
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        )
        User.objects.create_user(
            email="pending-contractor-list@example.com",
            password="StrongPass123",
            first_name="Hidden",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        )
        User.objects.create_user(
            email="customer-list@example.com",
            password="StrongPass123",
            first_name="Hidden",
            last_name="Customer",
            role=User.Role.CUSTOMER,
        )

        response = self.client.get(reverse("contractor-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], contractor.id)
        self.assertEqual(response.data[0]["name"], "Listed Contractor")
        self.assertEqual(response.data[0]["bio"], contractor.bio)
        self.assertEqual(response.data[0]["location"], contractor.location)
        self.assertEqual(response.data[0]["hourly_rate"], "55.00")
        self.assertEqual(response.data[0]["services"], contractor.services)
        self.assertEqual(response.data[0]["role"], User.Role.CONTRACTOR)
        self.assertIsNone(response.data[0]["average_rating"])
        self.assertEqual(response.data[0]["review_count"], 0)

    def test_contractors_endpoint_includes_review_summary(self):
        customer = User.objects.create_user(
            email="rating-customer@example.com",
            password="StrongPass123",
            role=User.Role.CUSTOMER,
        )
        contractor = User.objects.create_user(
            email="rated-contractor@example.com",
            password="StrongPass123",
            first_name="Rated",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        )

        for rating in (5, 4):
            job = JobRequest.objects.create(
                customer=customer,
                contractor=contractor,
                title=f"Completed job {rating}",
                description="Done well.",
                location="Makati",
                status=JobRequest.Status.COMPLETED,
            )
            quote = Quote.objects.create(
                job=job,
                contractor=contractor,
                price="1000.00",
                status=Quote.Status.ACCEPTED,
            )
            booking = Booking.objects.create(
                job=job,
                quote=quote,
                customer=customer,
                contractor=contractor,
                status=Booking.Status.COMPLETED,
            )
            Review.objects.create(
                booking=booking,
                customer=customer,
                contractor=contractor,
                rating=rating,
            )

        response = self.client.get(reverse("contractor-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["id"], contractor.id)
        self.assertEqual(response.data[0]["average_rating"], 4.5)
        self.assertEqual(response.data[0]["review_count"], 2)

    def test_admin_can_view_pending_contractors(self):
        admin = User.objects.create_user(
            email="admin-review@example.com",
            password="StrongPass123",
            first_name="Admin",
            last_name="Reviewer",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        contractor = User.objects.create_user(
            email="pending-review@example.com",
            password="StrongPass123",
            first_name="Pending",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        )
        User.objects.create_user(
            email="approved-review@example.com",
            password="StrongPass123",
            first_name="Approved",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=True,
            contractor_verification_status=User.ContractorVerificationStatus.APPROVED,
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": admin.email, "password": "StrongPass123"},
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        response = self.client.get(reverse("admin-pending-contractors"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], contractor.id)
        self.assertEqual(response.data[0]["email"], contractor.email)
        self.assertIn("has_government_id", response.data[0])
        self.assertNotIn("government_id", response.data[0])

    def test_admin_can_open_pending_contractor_government_id(self):
        admin = User.objects.create_user(
            email="admin-id-review@example.com",
            password="StrongPass123",
            first_name="Admin",
            last_name="Reviewer",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        contractor = User.objects.create_user(
            email="pending-id-review@example.com",
            password="StrongPass123",
            first_name="Pending",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
            government_id=upload_file("government-id.txt", b"private id"),
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": admin.email, "password": "StrongPass123"},
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        response = self.client.get(
            reverse("admin-contractor-government-id", kwargs={"pk": contractor.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(b"".join(response.streaming_content), b"private id")
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")

    def test_non_admin_cannot_open_contractor_government_id(self):
        customer = User.objects.create_user(
            email="customer-id-review@example.com",
            password="StrongPass123",
            role=User.Role.CUSTOMER,
        )
        contractor = User.objects.create_user(
            email="private-id-review@example.com",
            password="StrongPass123",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
            government_id=upload_file("government-id.txt", b"private id"),
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": customer.email, "password": "StrongPass123"},
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        response = self.client.get(
            reverse("admin-contractor-government-id", kwargs={"pk": contractor.id})
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_approve_pending_contractor(self):
        admin = User.objects.create_user(
            email="admin-approve@example.com",
            password="StrongPass123",
            first_name="Admin",
            last_name="Approver",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        contractor = User.objects.create_user(
            email="approve-review@example.com",
            password="StrongPass123",
            first_name="Approve",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
            is_active=False,
            contractor_verification_status=User.ContractorVerificationStatus.PENDING,
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": admin.email, "password": "StrongPass123"},
            format="json",
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}"
        )
        response = self.client.patch(
            reverse("admin-review-contractor", kwargs={"pk": contractor.id}),
            {"action": "approve"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contractor.refresh_from_db()
        self.assertTrue(contractor.is_active)
        self.assertEqual(
            contractor.contractor_verification_status,
            User.ContractorVerificationStatus.APPROVED,
        )
