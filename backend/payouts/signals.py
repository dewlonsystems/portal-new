from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Payout

@receiver(post_delete, sender=Payout)
def prevent_payout_deletion(sender, instance, **kwargs):
    raise ValueError("Payout records are immutable and cannot be deleted.")