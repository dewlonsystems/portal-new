from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Invoice

@receiver(post_delete, sender=Invoice)
def prevent_invoice_deletion(sender, instance, **kwargs):
    raise ValueError("Invoice records are immutable and cannot be deleted.")