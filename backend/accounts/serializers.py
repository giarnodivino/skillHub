from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class AdminContractorReviewSerializer(serializers.ModelSerializer):
    action = serializers.ChoiceField(write_only=True, choices=["approve", "reject"])

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "profile_picture",
            "government_id",
            "contractor_verification_status",
            "is_active",
            "action",
        )
        read_only_fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "profile_picture",
            "government_id",
            "contractor_verification_status",
            "is_active",
        )

    def update(self, instance, validated_data):
        action = validated_data.pop("action")
        if action == "approve":
            instance.contractor_verification_status = (
                User.ContractorVerificationStatus.APPROVED
            )
            instance.is_active = True
        else:
            instance.contractor_verification_status = (
                User.ContractorVerificationStatus.REJECTED
            )
            instance.is_active = False

        instance.save()
        return instance


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
            "profile_picture",
            "bio",
            "location",
            "hourly_rate",
            "services",
            "contractor_verification_status",
        )
        read_only_fields = (
            "id",
            "email",
            "role",
            "contractor_verification_status",
        )


class ContractorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "name",
            "role",
            "profile_picture",
            "bio",
            "location",
            "hourly_rate",
            "services",
            "contractor_verification_status",
        )
        read_only_fields = fields

    def get_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.email


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "profile_picture",
            "bio",
            "location",
            "hourly_rate",
            "services",
            "government_id",
            "contractor_verification_status",
            "is_active",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "government_id": {"write_only": True, "required": False},
            "contractor_verification_status": {"read_only": True},
            "is_active": {"read_only": True},
            "profile_picture": {"required": False},
        }

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Admin users cannot register publicly.")
        return value

    def validate(self, attrs):
        role = attrs.get("role", User.Role.CUSTOMER)

        if role == User.Role.CONTRACTOR:
            errors = {}
            if not attrs.get("profile_picture"):
                errors["profile_picture"] = "Contractors must upload a profile picture."
            if not attrs.get("government_id"):
                errors["government_id"] = (
                    "Contractors must upload a government ID for review."
                )

            if errors:
                raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        if validated_data.get("role") == User.Role.CONTRACTOR:
            validated_data["is_active"] = False
            validated_data["contractor_verification_status"] = (
                User.ContractorVerificationStatus.PENDING
            )
        else:
            validated_data["contractor_verification_status"] = (
                User.ContractorVerificationStatus.NOT_REQUIRED
            )
        return User.objects.create_user(password=password, **validated_data)
