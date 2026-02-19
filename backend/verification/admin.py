from django.contrib import admin
from .models import VerificationLog

@admin.register(VerificationLog)
class VerificationLogAdmin(admin.ModelAdmin):
    list_display = ('document_code', 'is_valid', 'document_type', 'verified_at', 'ip_address')
    list_filter = ('is_valid', 'document_type', 'verified_at')
    search_fields = ('document_code', 'ip_address')
    readonly_fields = ('document_code', 'ip_address', 'verified_at', 'is_valid', 'document_type', 'is_immutable')
    ordering = ['-verified_at']

    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False