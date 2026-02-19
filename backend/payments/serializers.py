from rest_framework import serializers
from .models import Transaction, MpesaSTKRequest, PaystackTransaction, LedgerEntry
from django.contrib.auth import get_user_model

User = get_user_model()

class TransactionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'reference_code', 'provider_reference', 'amount', 'payment_method',
            'status', 'description', 'phone_number', 'email', 'created_at', 'updated_at',
            'completed_at', 'failed_reason', 'user', 'user_username', 'user_first_name', 'user_last_name'
        ]
        read_only_fields = [
            'id', 'reference_code', 'provider_reference', 'status', 'created_at',
            'updated_at', 'completed_at', 'failed_reason', 'user'
        ]

class TransactionInitiateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    payment_method = serializers.ChoiceField(choices=['MPESA', 'PAYSTACK'])
    phone_number = serializers.CharField(max_length=15, required=False)
    email = serializers.EmailField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data['payment_method'] == 'MPESA' and not data.get('phone_number'):
            raise serializers.ValidationError({'phone_number': 'Phone number is required for Mpesa payments'})
        if data['payment_method'] == 'PAYSTACK' and not data.get('email'):
            raise serializers.ValidationError({'email': 'Email is required for Paystack payments'})
        return data

class MpesaSTKSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaSTKRequest
        fields = [
            'id', 'transaction', 'checkout_request_id', 'merchant_request_id',
            'status', 'response_code', 'response_description', 'created_at'
        ]
        read_only_fields = fields

class PaystackTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaystackTransaction
        fields = [
            'id', 'transaction', 'reference', 'authorization_url', 'access_code',
            'status', 'gateway_response', 'paid_at', 'channel', 'created_at'
        ]
        read_only_fields = fields

class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = [
            'id', 'transaction', 'entry_type', 'amount', 'balance_after',
            'description', 'reference', 'created_at', 'is_immutable'
        ]
        read_only_fields = fields

class TransactionSummarySerializer(serializers.Serializer):
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transactions = serializers.IntegerField()
    completed_transactions = serializers.IntegerField()
    pending_transactions = serializers.IntegerField()
    failed_transactions = serializers.IntegerField()