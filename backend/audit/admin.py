from django.contrib import admin
from .models import AuditLog, UserSession

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'description', 'ip_address')
    list_filter = ('action', 'timestamp', 'user')
    search_fields = ('description', 'user__username', 'ip_address')
    readonly_fields = ('user', 'action', 'description', 'ip_address', 'user_agent', 'timestamp', 'is_immutable', 'metadata')
    ordering = ['-timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'session_key', 'ip_address', 'last_seen', 'is_active')
    list_filter = ('is_active', 'last_seen')
    search_fields = ('user__username', 'session_key', 'ip_address')
    readonly_fields = ('user', 'session_key', 'ip_address', 'user_agent', 'created_at', 'last_seen', 'is_active')
    ordering = ['-last_seen']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False