from django.db import models
from django.conf import settings
from django.utils import timezone
from utils.helpers import generate_reference_code

class Payout(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    admin_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payouts')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    provider_reference = models.CharField(max_length=100, blank=True, null=True)
    recipient_name = models.CharField(max_length=100)
    recipient_phone = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    conversation_id = models.CharField(max_length=100, blank=True, null=True)
    originator_conversation_id = models.CharField(max_length=100, blank=True, null=True)
    callback_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_reason = models.TextField(blank=True, null=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['admin_user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.recipient_name} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DD')
        if self.status == 'COMPLETED' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Payout records are immutable and cannot be deleted.")

    def update_status(self, status, callback_data=None, failed_reason=None):
        if self.status in ['COMPLETED', 'FAILED', 'CANCELLED']:
            if status != self.status:
                raise ValueError("Cannot change status of completed/failed/cancelled payout except via callback.")
        
        self.status = status
        if callback_data:
            self.callback_data = callback_data
        if failed_reason:
            self.failed_reason = failed_reason
        if status == 'COMPLETED':
            self.completed_at = timezone.now()
        self.save(update_fields=['status', 'callback_data', 'failed_reason', 'completed_at', 'updated_at'])

class PayoutRequest(models.Model):
    STATUS_CHOICES = (
        ('INITIATED', 'Initiated'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    payout = models.OneToOneField(Payout, on_delete=models.CASCADE, related_name='b2c_request')
    conversation_id = models.CharField(max_length=100, blank=True, null=True)
    originator_conversation_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    response_code = models.CharField(max_length=20, blank=True, null=True)
    response_description = models.TextField(blank=True, null=True)
    result_code = models.CharField(max_length=20, blank=True, null=True)
    result_desc = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']