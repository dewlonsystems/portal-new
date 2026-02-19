from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Receipt

@receiver(post_delete, sender=Receipt)
def prevent_receipt_deletion(sender, instance, **kwargs):
    raise ValueError("Receipt records are immutable and cannot be deleted.")