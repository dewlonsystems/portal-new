from django.contrib import admin
from .models import Invoice

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'client_name', 'total_amount', 'status', 'due_date', 'created_at')
    list_filter = ('status', 'due_date', 'created_at')
    search_fields = ('reference_code', 'client_name', 'client_email', 'client_company')
    readonly_fields = ('reference_code', 'created_at', 'updated_at', 'paid_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False