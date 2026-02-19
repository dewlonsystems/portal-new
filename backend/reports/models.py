from django.db import models
from django.conf import settings

class DashboardCache(models.Model):
    """
    Caches dashboard data for performance optimization.
    Refreshed periodically via Celery beat.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    cache_key = models.CharField(max_length=100, unique=True)
    cache_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_valid = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cache_key', 'is_valid']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.cache_key} - {self.created_at}"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at