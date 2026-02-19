from django.contrib import admin
from .models import Notification, AdminNotification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'recipient', 'priority', 'is_read', 'created_at')
    list_filter = ('notification_type', 'priority', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__username')
    readonly_fields = ('created_at', 'read_at')
    ordering = ['-created_at']

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'title', 'is_resolved', 'resolved_by', 'created_at')
    list_filter = ('notification_type', 'is_resolved', 'created_at')
    search_fields = ('title', 'message')
    readonly_fields = ('created_at', 'resolved_at', 'resolved_by')
    ordering = ['-created_at']