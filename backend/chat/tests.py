from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Conversation, Message


User = get_user_model()


class ChatApiTests(APITestCase):
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
        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": user.email, "password": "StrongPass123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")

    def test_customer_can_start_conversation_with_approved_contractor(self):
        self.authenticate(self.customer)

        response = self.client.post(
            reverse("conversation-list"),
            {"contractor_id": self.contractor.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)
        self.assertEqual(response.data["contractor"]["id"], self.contractor.id)
        self.assertEqual(response.data["other_participant"]["id"], self.contractor.id)

    def test_customer_reuses_existing_conversation(self):
        self.authenticate(self.customer)

        for _ in range(2):
            response = self.client.post(
                reverse("conversation-list"),
                {"contractor_id": self.contractor.id},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)

    def test_cannot_start_conversation_with_pending_contractor(self):
        self.authenticate(self.customer)

        response = self.client.post(
            reverse("conversation-list"),
            {"contractor_id": self.pending_contractor.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Conversation.objects.count(), 0)

    def test_participants_can_send_and_read_messages(self):
        conversation = Conversation.objects.create(
            customer=self.customer,
            contractor=self.contractor,
        )
        self.authenticate(self.customer)

        send_response = self.client.post(
            reverse("conversation-messages", kwargs={"conversation_pk": conversation.id}),
            {"body": "Hi, are you available this week?"},
            format="json",
        )
        list_response = self.client.get(
            reverse("conversation-messages", kwargs={"conversation_pk": conversation.id})
        )

        self.assertEqual(send_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(list_response.data[0]["body"], "Hi, are you available this week?")
        self.assertTrue(list_response.data[0]["is_mine"])

    def test_non_participant_cannot_read_messages(self):
        stranger = User.objects.create_user(
            email="stranger@example.com",
            password="StrongPass123",
            role=User.Role.CUSTOMER,
        )
        conversation = Conversation.objects.create(
            customer=self.customer,
            contractor=self.contractor,
        )
        self.authenticate(stranger)

        response = self.client.get(
            reverse("conversation-messages", kwargs={"conversation_pk": conversation.id})
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
