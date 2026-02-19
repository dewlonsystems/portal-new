from rest_framework import serializers
from .models import Quote
from django.contrib.auth import get_user_model

User = get_user_model()

class QuoteSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_first_name = serializers.CharField(source='created_by.first_name', read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id', 'reference_code', 'client_name', 'client_email', 'client_phone',
            'service_description', 'amount', 'valid_until', 'status', 'created_at',
            'updated_at', 'created_by', 'created_by_username', 'created_by_first_name'
        ]
        read_only_fields = [
            'id', 'reference_code', 'status', 'created_at', 'updated_at', 'created_by'
        ]

class QuoteCreateSerializer(serializers.Serializer):
    client_name = serializers.CharField(max_length=100)
    client_email = serializers.EmailField()
    client_phone = serializers.CharField(max_length=15)
    service_description = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)