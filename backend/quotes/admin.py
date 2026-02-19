from django.contrib import admin
from .models import Quote

@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('reference_code', 'client_name', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reference_code', 'client_name', 'client_email')
    readonly_fields = ('reference_code', 'created_at', 'updated_at', 'is_immutable')
    ordering = ['-created_at']

    def has_delete_permission(self, request, obj=None):
        return False