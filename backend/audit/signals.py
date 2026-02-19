from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import AuditLog

@receiver(post_save, sender=AuditLog)
def prevent_audit_log_modification(sender, instance, created, **kwargs):
    if not created:
        raise ValueError("AuditLog entries are immutable and cannot be modified.")

@receiver(post_delete, sender=AuditLog)
def prevent_audit_log_deletion(sender, instance, **kwargs):
    raise ValueError("AuditLog entries are immutable and cannot be deleted.")