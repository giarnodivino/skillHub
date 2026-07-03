from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, Message


User = get_user_model()


class ChatUserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "name", "role", "profile_picture")

    def get_name(self, obj):
        return obj.get_full_name().strip() or obj.email


class MessageSerializer(serializers.ModelSerializer):
    sender = ChatUserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "body", "created_at", "is_mine")
        read_only_fields = ("id", "conversation", "sender", "created_at", "is_mine")

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)

    def validate_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return value.strip()


class ConversationSerializer(serializers.ModelSerializer):
    customer = ChatUserSerializer(read_only=True)
    contractor = ChatUserSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "customer",
            "contractor",
            "other_participant",
            "latest_message",
            "created_at",
            "updated_at",
        )

    def get_other_participant(self, obj):
        request = self.context.get("request")
        if request and request.user.id == obj.customer_id:
            return ChatUserSerializer(obj.contractor, context=self.context).data
        return ChatUserSerializer(obj.customer, context=self.context).data

    def get_latest_message(self, obj):
        latest_message = obj.messages.order_by("-created_at").first()
        if not latest_message:
            return None
        return MessageSerializer(latest_message, context=self.context).data


class ConversationCreateSerializer(serializers.Serializer):
    contractor_id = serializers.IntegerField()

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.role != User.Role.CUSTOMER:
            raise serializers.ValidationError("Only customers can start new contractor chats.")
        return attrs

    def validate_contractor_id(self, value):
        try:
            contractor = User.objects.get(pk=value)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("Contractor was not found.") from exc

        if contractor.role != User.Role.CONTRACTOR:
            raise serializers.ValidationError("You can only start chats with contractors.")

        if (
            not contractor.is_active
            or contractor.contractor_verification_status
            != User.ContractorVerificationStatus.APPROVED
        ):
            raise serializers.ValidationError("This contractor is not available for chat.")

        request = self.context.get("request")
        if request and contractor.id == request.user.id:
            raise serializers.ValidationError("You cannot start a chat with yourself.")

        self.contractor = contractor
        return value

    def save(self, **kwargs):
        request = self.context["request"]
        conversation, _created = Conversation.objects.get_or_create(
            customer=request.user,
            contractor=self.contractor,
        )
        return conversation
