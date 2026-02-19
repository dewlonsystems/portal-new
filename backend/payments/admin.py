from django.contrib import admin
from .models import Transaction, MpesaSTKRequest, PaystackTransaction, LedgerEntry

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'user', 'amount', 'payment_method', 'status', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('reference_code', 'user__username', 'provider_reference')
    readonly_fields = ('reference_code', 'created_at', 'updated_at', 'completed_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(MpesaSTKRequest)
class MpesaSTKRequestAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'checkout_request_id', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('checkout_request_id', 'transaction__reference_code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ['-created_at']

@admin.register(PaystackTransaction)
class PaystackTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction', 'reference', 'status', 'paid_at', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference', 'transaction__reference_code')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ['-created_at']

@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('reference', 'transaction', 'entry_type', 'amount', 'balance_after', 'created_at')
    list_filter = ('entry_type', 'created_at')
    search_fields = ('reference', 'description')
    readonly_fields = ('reference', 'created_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False