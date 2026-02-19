from django.db import models
from django.utils import timezone

class VerificationLog(models.Model):
    document_code = models.CharField(max_length=20, db_index=True)
    ip_address = models.GenericIPAddressField()
    verified_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField()
    document_type = models.CharField(max_length=50, blank=True, null=True)
    is_immutable = models.BooleanField(default=True, editable=False)

    class Meta:
        ordering = ['-verified_at']
        indexes = [
            models.Index(fields=['document_code', 'verified_at']),
        ]

    def __str__(self):
        return f"{self.document_code} - {'Valid' if self.is_valid else 'Invalid'} - {self.verified_at}"

    def delete(self, *args, **kwargs):
        raise ValueError("VerificationLog records are immutable and cannot be deleted.")