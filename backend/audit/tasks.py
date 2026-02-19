from celery import shared_task
from .models import AuditLog

@shared_task
def log_action(user_id, action, description, ip_address=None, user_agent=None, metadata=None):
    """
    Asynchronously logs an action to the audit log.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = User.objects.filter(id=user_id).first()
    
    AuditLog.objects.create(
        user=user,
        action=action,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=metadata or {}
    )

@shared_task
def log_logout(user_id, ip_address=None, user_agent=None):
    """
    Logs a user logout action and deactivates their session.
    """
    from django.contrib.auth import get_user_model
    from .models import UserSession
    User = get_user_model()
    
    user = User.objects.filter(id=user_id).first()
    
    log_action.delay(
        user_id=user_id,
        action='LOGOUT',
        description=f'User {user.username if user else "unknown"} logged out',
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    UserSession.objects.filter(user=user, is_active=True).update(is_active=False)