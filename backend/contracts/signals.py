from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Contract, Invoice

@receiver(post_delete, sender=Contract)
def prevent_contract_deletion(sender, instance, **kwargs):
    raise ValueError("Contract records are immutable and cannot be deleted.")

@receiver(post_delete, sender=Invoice)
def prevent_invoice_deletion(sender, instance, **kwargs):
    raise ValueError("Invoice records are immutable and cannot be deleted.")