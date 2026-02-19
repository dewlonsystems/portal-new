from rest_framework import serializers
from .models import Receipt
from payments.models import Transaction

class ReceiptSerializer(serializers.ModelSerializer):
    transaction_reference = serializers.CharField(source='transaction.reference_code', read_only=True)
    transaction_amount = serializers.DecimalField(source='transaction.amount', max_digits=12, decimal_places=2, read_only=True)
    transaction_status = serializers.CharField(source='transaction.status', read_only=True)
    transaction_payment_method = serializers.CharField(source='transaction.payment_method', read_only=True)
    downloaded_by_username = serializers.CharField(source='downloaded_by.username', read_only=True)

    class Meta:
        model = Receipt
        fields = [
            'id', 'reference_code', 'transaction', 'transaction_reference', 'transaction_amount',
            'transaction_status', 'transaction_payment_method', 'pdf_file', 'status', 'generated_at',
            'downloaded_at', 'downloaded_by', 'downloaded_by_username', 'download_count', 'is_immutable'
        ]
        read_only_fields = fields

class ReceiptGenerateSerializer(serializers.Serializer):
    transaction_id = serializers.IntegerField()

class ReceiptDownloadSerializer(serializers.Serializer):
    receipt_id = serializers.IntegerField()