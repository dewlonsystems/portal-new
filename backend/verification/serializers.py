from rest_framework import serializers
from .models import VerificationLog

class VerificationRequestSerializer(serializers.Serializer):
    document_code = serializers.CharField(max_length=20)

class VerificationResponseSerializer(serializers.Serializer):
    is_valid = serializers.BooleanField()
    document_type = serializers.CharField()
    document_code = serializers.CharField()
    date_of_issue = serializers.DateTimeField()
    issuing_user = serializers.CharField()
    message = serializers.CharField()

class VerificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationLog
        fields = ['document_code', 'verified_at', 'is_valid', 'document_type', 'ip_address']
        read_only_fields = fields