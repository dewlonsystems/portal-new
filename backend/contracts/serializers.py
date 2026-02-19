from rest_framework import serializers
from .models import Contract, Invoice
from django.contrib.auth import get_user_model

User = get_user_model()

class ContractSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    invoice_reference = serializers.CharField(source='invoice.reference_code', read_only=True)

    class Meta:
        model = Contract
        fields = [
            'id', 'reference_code', 'client_name', 'client_email', 'client_phone',
            'service_description', 'amount', 'status', 'signed_at', 'created_at',
            'updated_at', 'expires_at', 'created_by', 'created_by_username', 'invoice_reference',
            'signing_token'
        ]
        read_only_fields = [
            'id', 'reference_code', 'status', 'signed_at', 'created_at',
            'updated_at', 'expires_at', 'created_by', 'invoice_reference'
        ]

class ContractCreateSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=100)
    client_email = serializers.EmailField()
    client_phone = serializers.CharField(max_length=15)
    service_description = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)

class ContractSignSerializer(serializers.Serializer):
    signature_image = serializers.CharField() # Base64 string
    place_of_signing = serializers.CharField(max_length=100)

class InvoiceSerializer(serializers.ModelSerializer):
    contract_reference = serializers.CharField(source='contract.reference_code', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'reference_code', 'contract_reference', 'client_name', 'client_email',
            'client_phone', 'service_description', 'amount', 'due_date', 'status',
            'created_at', 'paid_at'
        ]
        read_only_fields = fields

class ContractPublicViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = ['reference_code', 'client_name', 'service_description', 'amount', 'status', 'expires_at']