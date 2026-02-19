from django.db import models
from django.conf import settings
from django.utils import timezone
from utils.helpers import generate_reference_code

class Transaction(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('MPESA', 'Mpesa'),
        ('PAYSTACK', 'Paystack'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    provider_reference = models.CharField(max_length=100, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    description = models.TextField(blank=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
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
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.amount} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DP')
        if self.status == 'COMPLETED' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Transaction records are immutable and cannot be deleted.")

    def update_status(self, status, callback_data=None, failed_reason=None):
        if self.status in ['COMPLETED', 'FAILED', 'CANCELLED']:
            if status != self.status:
                raise ValueError("Cannot change status of completed/failed/cancelled transaction except via callback.")
        
        self.status = status
        if callback_data:
            self.callback_data = callback_data
        if failed_reason:
            self.failed_reason = failed_reason
        if status == 'COMPLETED':
            self.completed_at = timezone.now()
        self.save(update_fields=['status', 'callback_data', 'failed_reason', 'completed_at', 'updated_at'])

class MpesaSTKRequest(models.Model):
    STATUS_CHOICES = (
        ('INITIATED', 'Initiated'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='mpesa_stk')
    checkout_request_id = models.CharField(max_length=100, blank=True, null=True)
    merchant_request_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    response_code = models.CharField(max_length=20, blank=True, null=True)
    response_description = models.TextField(blank=True, null=True)
    result_code = models.CharField(max_length=20, blank=True, null=True)
    result_desc = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class PaystackTransaction(models.Model):
    STATUS_CHOICES = (
        ('INITIATED', 'Initiated'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='paystack_tx')
    reference = models.CharField(max_length=100, unique=True)
    authorization_url = models.URLField(blank=True, null=True)
    access_code = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INITIATED')
    gateway_response = models.TextField(blank=True, null=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    channel = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class LedgerEntry(models.Model):
    ENTRY_TYPE_CHOICES = (
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    )

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='ledger_entries', null=True, blank=True)
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    description = models.TextField()
    reference = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['entry_type']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.entry_type} - {self.amount}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference_code('LE')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("LedgerEntry records are immutable and cannot be deleted.")

    def update(self, *args, **kwargs):
        raise ValueError("LedgerEntry records are immutable and cannot be updated.")