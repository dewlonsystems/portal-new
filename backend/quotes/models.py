from django.db import models
from django.conf import settings
from django.utils import timezone
from utils.helpers import generate_reference_code

class Quote(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('VIEWED', 'Viewed'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('EXPIRED', 'Expired'),
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quotes')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    client_name = models.CharField(max_length=100)
    client_email = models.EmailField()
    client_phone = models.CharField(max_length=15)
    service_description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    valid_until = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    pdf_file = models.FileField(upload_to='quotes/pdfs/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.client_name}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DQ')
        if not self.valid_until:
            self.valid_until = timezone.now() + timezone.timedelta(days=30)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Quote records are immutable and cannot be deleted.")

    def mark_sent(self):
        self.status = 'SENT'
        self.save(update_fields=['status', 'updated_at'])

    def mark_viewed(self):
        if self.status == 'SENT':
            self.status = 'VIEWED'
            self.save(update_fields=['status', 'updated_at'])