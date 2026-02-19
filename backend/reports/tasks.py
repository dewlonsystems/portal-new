from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import DashboardCache
from payments.models import Transaction
from users.models import User

@shared_task
def refresh_dashboard_cache():
    """
    Periodically refreshes dashboard cache for performance.
    """
    try:
        # Invalidate old caches
        DashboardCache.objects.filter(expires_at__lt=timezone.now()).update(is_valid=False)
        
        # Could pre-compute common queries here
        # For now, we compute on-demand in views
        
        return {'status': 'success', 'message': 'Dashboard cache refreshed'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def cleanup_old_cache():
    """
    Removes expired cache entries older than 7 days.
    """
    try:
        cutoff = timezone.now() - timedelta(days=7)
        deleted, _ = DashboardCache.objects.filter(expires_at__lt=cutoff).delete()
        return {'status': 'success', 'deleted_count': deleted}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}