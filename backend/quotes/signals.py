from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Quote

@receiver(post_delete, sender=Quote)
def prevent_quote_deletion(sender, instance, **kwargs):
    raise ValueError("Quote records are immutable and cannot be deleted.")