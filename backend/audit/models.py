from django.db import models
from django.conf import settings
from django.utils import timezone

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('LOGIN', 'User Login'),
        ('LOGOUT', 'User Logout'),
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('USER_DELETED', 'User Deleted'),
        ('PASSWORD_CHANGED', 'Password Changed'),
        ('PASSWORD_RESET_REQUEST', 'Password Reset Requested'),
        ('PASSWORD_RESET_ADMIN', 'Password Reset by Admin'),
        ('PAYMENT_INITIATED', 'Payment Initiated'),
        ('PAYMENT_COMPLETED', 'Payment Completed'),
        ('PAYMENT_FAILED', 'Payment Failed'),
        ('PAYOUT_INITIATED', 'Payout Initiated'),
        ('PAYOUT_COMPLETED', 'Payout Completed'),
        ('PAYOUT_FAILED', 'Payout Failed'),
        ('QUOTE_CREATED', 'Quote Created'),
        ('QUOTE_SENT', 'Quote Sent'),
        ('CONTRACT_CREATED', 'Contract Created'),
        ('CONTRACT_SIGNED', 'Contract Signed'),
        ('INVOICE_CREATED', 'Invoice Created'),
        ('INVOICE_SENT', 'Invoice Sent'),
        ('RECEIPT_GENERATED', 'Receipt Generated'),
        ('DOCUMENT_VERIFIED', 'Document Verified'),
        ('UNKNOWN', 'Unknown Action'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_immutable = models.BooleanField(default=True, editable=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f"{self.action} - {self.user.username if self.user else 'Anonymous'} - {self.timestamp}"

    def save(self, *args, **kwargs):
        if self.pk and not self._state.adding:
            raise ValueError("AuditLog entries are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("AuditLog entries are immutable and cannot be deleted.")

class UserSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=40, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_seen']

    def __str__(self):
        return f"{self.user.username} - {self.session_key}"