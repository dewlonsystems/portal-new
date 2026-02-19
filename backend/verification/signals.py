from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import VerificationLog

@receiver(post_delete, sender=VerificationLog)
def prevent_verification_log_deletion(sender, instance, **kwargs):
    raise ValueError("VerificationLog records are immutable and cannot be deleted.")