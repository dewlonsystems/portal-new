from django.db import models
from django.conf import settings
from django.utils import timezone
from utils.helpers import generate_reference_code

class Receipt(models.Model):
    STATUS_CHOICES = (
        ('GENERATED', 'Generated'),
        ('DOWNLOADED', 'Downloaded'),
        ('EMAIL_SENT', 'Email Sent'),
    )

    transaction = models.OneToOneField('payments.Transaction', on_delete=models.CASCADE, related_name='receipt')
    reference_code = models.CharField(max_length=20, unique=True, editable=False)
    pdf_file = models.FileField(upload_to='receipts/pdfs/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='GENERATED')
    generated_at = models.DateTimeField(auto_now_add=True)
    downloaded_at = models.DateTimeField(null=True, blank=True)
    downloaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='downloaded_receipts')
    download_count = models.PositiveIntegerField(default=0)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-generated_at']
        indexes = [
            models.Index(fields=['reference_code']),
            models.Index(fields=['transaction']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.reference_code} - {self.transaction.reference_code}"

    def save(self, *args, **kwargs):
        if not self.reference_code:
            self.reference_code = generate_reference_code('DR')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Receipt records are immutable and cannot be deleted.")

    def mark_downloaded(self, user):
        from django.utils import timezone
        self.downloaded_at = timezone.now()
        self.downloaded_by = user
        self.download_count += 1
        self.status = 'DOWNLOADED'
        self.save(update_fields=['downloaded_at', 'downloaded_by', 'download_count', 'status', 'updated_at'])

    def mark_email_sent(self):
        self.status = 'EMAIL_SENT'
        self.save(update_fields=['status', 'updated_at'])