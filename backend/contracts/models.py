from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from utils.helpers import generate_reference_code
import secrets

class Contract(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('VIEWED', 'Viewed'),
        ('SIGNED', 'Signed'),
        ('EXPIRED', 'Expired'),
        ('CANCELLED', 'Cancelled'),
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_contracts')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    client_name = models.CharField(max_length=100)
    client_email = models.EmailField()
    client_phone = models.CharField(max_length=15)
    service_description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    signing_token = models.CharField(max_length=64, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    signed_at = models.DateTimeField(null=True, blank=True)
    signature_image = models.ImageField(upload_to='contracts/signatures/', null=True, blank=True)
    place_of_signing = models.CharField(max_length=100, blank=True, null=True)
    ip_address_signed = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['signing_token']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DC')
        if not self.signing_token:
            self.signing_token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7) # Link valid for 7 days
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Contract records are immutable and cannot be deleted.")

    def mark_viewed(self):
        if self.status == 'SENT':
            self.status = 'VIEWED'
            self.save(update_fields=['status', 'updated_at'])

    def mark_signed(self, signature_image, place_of_signing, ip_address):
        if self.status in ['SIGNED', 'EXPIRED', 'CANCELLED']:
            raise ValueError("Contract cannot be signed.")
        
        self.status = 'SIGNED'
        self.signed_at = timezone.now()
        self.signature_image = signature_image
        self.place_of_signing = place_of_signing
        self.ip_address_signed = ip_address
        self.save(update_fields=['status', 'signed_at', 'signature_image', 'place_of_signing', 'ip_address_signed', 'updated_at'])

class Invoice(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    )

    contract = models.OneToOneField(Contract, on_delete=models.CASCADE, related_name='invoice', null=True, blank=True)
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    client_name = models.CharField(max_length=100)
    client_email = models.EmailField()
    client_phone = models.CharField(max_length=15)
    service_description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DV')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Invoice records are immutable and cannot be deleted.")

    def mark_paid(self):
        self.status = 'PAID'
        self.paid_at = timezone.now()
        self.save(update_fields=['status', 'paid_at', 'updated_at'])