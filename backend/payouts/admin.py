from django.contrib import admin
from .models import Payout, PayoutRequest

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'recipient_name', 'recipient_phone', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference_code', 'recipient_name', 'recipient_phone')
    readonly_fields = ('reference_code', 'created_at', 'updated_at', 'completed_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = ('payout', 'conversation_id', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('conversation_id', 'payout__reference_code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ['-created_at']