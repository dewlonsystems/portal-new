from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from utils.helpers import generate_reference_code

class Invoice(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_invoices')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    client_name = models.CharField(max_length=100)
    client_email = models.EmailField()
    client_phone = models.CharField(max_length=15)
    client_company = models.CharField(max_length=100, blank=True, null=True)
    service_description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    pdf_file = models.FileField(upload_to='invoices/pdfs/', null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['created_by', 'status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DV')
        if not self.due_date:
            self.due_date = timezone.now() + timedelta(hours=72)
        if not self.total_amount:
            self.total_amount = self.amount + self.tax_amount
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Invoice records are immutable and cannot be deleted.")

    def mark_sent(self):
        self.status = 'SENT'
        self.save(update_fields=['status', 'updated_at'])

    def mark_paid(self, payment_reference=None):
        self.status = 'PAID'
        self.paid_at = timezone.now()
        self.payment_reference = payment_reference
        self.save(update_fields=['status', 'paid_at', 'payment_reference', 'updated_at'])

    def mark_overdue(self):
        if self.status not in ['PAID', 'CANCELLED']:
            self.status = 'OVERDUE'
            self.save(update_fields=['status', 'updated_at'])

    def mark_cancelled(self):
        self.status = 'CANCELLED'
        self.save(update_fields=['status', 'updated_at'])