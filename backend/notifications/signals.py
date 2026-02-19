from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Notification, AdminNotification

@receiver(post_delete, sender=Notification)
def log_notification_deletion(sender, instance, **kwargs):
    pass

@receiver(post_delete, sender=AdminNotification)
def log_admin_notification_deletion(sender, instance, **kwargs):
    pass