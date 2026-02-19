from rest_framework import serializers
from .models import AuditLog, UserSession

class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)
    user_last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_username', 'user_first_name', 'user_last_name',
            'action', 'description', 'ip_address', 'user_agent', 'timestamp',
            'is_immutable', 'metadata'
        ]
        read_only_fields = fields

class UserSessionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_first_name = serializers.CharField(source='user.first_name', read_only=True)

    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'user_username', 'user_first_name', 'session_key',
            'ip_address', 'user_agent', 'created_at', 'last_seen', 'is_active'
        ]
        read_only_fields = fields