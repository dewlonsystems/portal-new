from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import DashboardCache

@receiver(post_delete, sender=DashboardCache)
def log_cache_deletion(sender, instance, **kwargs):
    # Optional: Log cache invalidation
    pass