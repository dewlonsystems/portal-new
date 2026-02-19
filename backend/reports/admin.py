from django.contrib import admin
from .models import DashboardCache

@admin.register(DashboardCache)
class DashboardCacheAdmin(admin.ModelAdmin):
    list_display = ('cache_key', 'user', 'created_at', 'expires_at', 'is_valid')
    list_filter = ('is_valid', 'created_at')
    search_fields = ('cache_key', 'user__username')
    readonly_fields = ('created_at', 'expires_at')
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False