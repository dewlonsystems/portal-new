from django.contrib import admin
from .models import Receipt

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'transaction', 'status', 'download_count', 'generated_at')
    list_filter = ('status', 'generated_at')
    search_fields = ('reference_code', 'transaction__reference_code', 'transaction__user__username')
    readonly_fields = ('reference_code', 'generated_at', 'downloaded_at', 'download_count', 'is_immutable')
    ordering = ['-generated_at']

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False