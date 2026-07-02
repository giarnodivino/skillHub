from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


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


class AuthApiTests(APITestCase):
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
        self.assertNotIn("password", response.data)

    def test_register_contractor(self):
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

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], User.Role.CONTRACTOR)

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

    def test_contractors_endpoint_lists_only_contractors(self):
        contractor = User.objects.create_user(
            email="contractor-list@example.com",
            password="StrongPass123",
            first_name="Listed",
            last_name="Contractor",
            role=User.Role.CONTRACTOR,
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
        self.assertEqual(response.data[0]["role"], User.Role.CONTRACTOR)
