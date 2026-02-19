from rest_framework import serializers
from .models import Payout, PayoutRequest
from django.contrib.auth import get_user_model

User = get_user_model()

class PayoutSerializer(serializers.ModelSerializer):
    admin_username = serializers.CharField(source='admin_user.username', read_only=True)
    admin_first_name = serializers.CharField(source='admin_user.first_name', read_only=True)

    class Meta:
        model = Payout
        fields = [
            'id', 'reference_code', 'provider_reference', 'recipient_name', 'recipient_phone',
            'amount', 'reason', 'status', 'conversation_id', 'created_at', 'updated_at',
            'completed_at', 'failed_reason', 'admin_user', 'admin_username', 'admin_first_name'
        ]
        read_only_fields = [
            'id', 'reference_code', 'provider_reference', 'status', 'created_at',
            'updated_at', 'completed_at', 'failed_reason', 'admin_user', 'conversation_id'
        ]

class PayoutInitiateSerializer(serializers.Serializer):
    recipient_name = serializers.CharField(max_length=100)
    recipient_phone = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    reason = serializers.CharField(max_length=200)

    def validate_recipient_phone(self, value):
        if not value.startswith('254'):
            raise serializers.ValidationError("Phone number must start with 254 (e.g., 254712345678)")
        return value

class PayoutRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'payout', 'conversation_id', 'originator_conversation_id',
            'status', 'response_code', 'response_description', 'created_at'
        ]
        read_only_fields = fields

class PayoutSummarySerializer(serializers.Serializer):
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_payouts = serializers.IntegerField()
    completed_payouts = serializers.IntegerField()
    pending_payouts = serializers.IntegerField()
    failed_payouts = serializers.IntegerField()