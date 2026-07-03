from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Conversation, Message
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageSerializer,
)


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.filter(Q(customer=user) | Q(contractor=user))
            .select_related("customer", "contractor")
            .prefetch_related("messages", "messages__sender")
            .order_by("-updated_at")
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateSerializer
        return ConversationSerializer

    def create(self, request, *args, **kwargs):
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        conversation = create_serializer.save()
        serializer = ConversationSerializer(conversation, context=self.get_serializer_context())
        return Response(serializer.data, status=201)


class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self):
        conversation = get_object_or_404(
            Conversation.objects.select_related("customer", "contractor"),
            pk=self.kwargs["conversation_pk"],
        )
        if self.request.user.id not in (conversation.customer_id, conversation.contractor_id):
            raise PermissionDenied("You do not have access to this conversation.")
        return conversation

    def get_queryset(self):
        return (
            Message.objects.filter(conversation=self.get_conversation())
            .select_related("sender")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        conversation = self.get_conversation()
        serializer.save(conversation=conversation, sender=self.request.user)
        conversation.save(update_fields=["updated_at"])
