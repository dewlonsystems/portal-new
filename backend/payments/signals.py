from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Transaction, LedgerEntry

@receiver(post_save, sender=Transaction)
def prevent_transaction_modification(sender, instance, created, **kwargs):
    if not created and instance.is_immutable:
        # Allow status updates via callback only
        pass

@receiver(post_delete, sender=Transaction)
def prevent_transaction_deletion(sender, instance, **kwargs):
    raise ValueError("Transaction records are immutable and cannot be deleted.")

@receiver(post_delete, sender=LedgerEntry)
def prevent_ledger_deletion(sender, instance, **kwargs):
    raise ValueError("LedgerEntry records are immutable and cannot be deleted.")