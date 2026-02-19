from rest_framework import serializers
from .models import Invoice
from django.contrib.auth import get_user_model

User = get_user_model()

class InvoiceSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_first_name = serializers.CharField(source='created_by.first_name', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'reference_code', 'client_name', 'client_email', 'client_phone', 'client_company',
            'service_description', 'amount', 'tax_amount', 'total_amount', 'due_date', 'status',
            'pdf_file', 'paid_at', 'payment_reference', 'notes', 'created_at', 'updated_at',
            'created_by', 'created_by_username', 'created_by_first_name'
        ]
        read_only_fields = [
            'id', 'reference_code', 'status', 'created_at', 'updated_at', 'created_by', 'paid_at'
        ]

class InvoiceCreateSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=100)
    client_email = serializers.EmailField()
    client_phone = serializers.CharField(max_length=15)
    client_company = serializers.CharField(max_length=100, required=False, allow_blank=True)
    service_description = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

class InvoiceUpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['PAID', 'CANCELLED'])
    payment_reference = serializers.CharField(required=False, allow_blank=True)