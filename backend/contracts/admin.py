from django.contrib import admin
from .models import Contract, Invoice

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'client_name', 'amount', 'status', 'created_at', 'signed_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference_code', 'client_name', 'client_email')
    readonly_fields = ('reference_code', 'signing_token', 'created_at', 'updated_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'client_name', 'amount', 'status', 'due_date', 'created_at')
    list_filter = ('status', 'due_date')
    search_fields = ('reference_code', 'client_name')
    readonly_fields = ('reference_code', 'created_at', 'updated_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False