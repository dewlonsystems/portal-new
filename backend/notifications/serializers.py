from rest_framework import serializers
from .models import Notification, AdminNotification

class NotificationSerializer(serializers.ModelSerializer):
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_username', 'notification_type', 'priority',
            'title', 'message', 'is_read', 'metadata', 'created_at', 'read_at', 'expires_at'
        ]
        read_only_fields = fields

class AdminNotificationSerializer(serializers.ModelSerializer):
    resolved_by_username = serializers.CharField(source='resolved_by.username', read_only=True)

    class Meta:
        model = AdminNotification
        fields = [
            'id', 'notification_type', 'title', 'message', 'is_resolved',
            'resolved_at', 'resolved_by', 'resolved_by_username', 'created_at', 'metadata'
        ]
        read_only_fields = ['id', 'created_at', 'resolved_at', 'resolved_by', 'resolved_by_username']

class AdminNotificationCreateSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=AdminNotification.TYPE_CHOICES)
    title = serializers.CharField(max_length=200)
    message = serializers.CharField()
    metadata = serializers.JSONField(required=False, default=dict)