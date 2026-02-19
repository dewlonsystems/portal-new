from celery import shared_task
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib.auth import get_user_model
from .models import Notification, AdminNotification

User = get_user_model()

@shared_task
def notify_admins_password_reset(user_id):
    """
    Notifies all admins when a staff user requests a password reset.
    """
    try:
        user = User.objects.get(id=user_id)
        admins = User.objects.filter(role='ADMIN')
        
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notification_type='PASSWORD_RESET_REQUEST',
                priority='HIGH',
                title=f'Password Reset Request: {user.username}',
                message=f'{user.first_name} {user.last_name} ({user.username}) has requested a password reset.',
                metadata={'requesting_user_id': user_id, 'requesting_username': user.username}
            )
        
        # Also create admin notification
        AdminNotification.objects.create(
            notification_type='PASSWORD_RESET_REQUEST',
            title=f'Password Reset Request: {user.username}',
            message=f'{user.first_name} {user.last_name} ({user.username}) has requested a password reset. Please review and reset their password.',
            metadata={'requesting_user_id': user_id, 'requesting_username': user.username}
        )
        
        # Send email to admins
        subject = f'Password Reset Request: {user.username}'
        html_message = render_to_string('notifications/email_password_reset_request.html', {
            'user': user,
            'request_time': user.reset_requests.latest('requested_at').requested_at if user.reset_requests.exists() else None
        })
        
        admin_emails = [admin.email for admin in admins]
        
        email = EmailMultiAlternatives(
            subject,
            subject,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        
        return {'status': 'success', 'admins_notified': len(admins)}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def send_admin_notification_email(notification_id):
    """
    Sends email notification to admins for critical notifications.
    """
    try:
        notification = AdminNotification.objects.get(id=notification_id)
        admins = User.objects.filter(role='ADMIN')
        
        subject = f'[Portal] {notification.title}'
        html_message = render_to_string('notifications/email_admin_notification.html', {
            'notification': notification
        })
        
        admin_emails = [admin.email for admin in admins]
        
        email = EmailMultiAlternatives(
            subject,
            subject,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails
        )
        email.attach_alternative(html_message, "text/html")
        email.send()
        
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def send_user_notification(user_id, notification_type, title, message, priority='MEDIUM', metadata=None):
    """
    Sends a notification to a specific user.
    """
    try:
        user = User.objects.get(id=user_id)
        Notification.objects.create(
            recipient=user,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            metadata=metadata or {}
        )
        return {'status': 'success'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def cleanup_old_notifications():
    """
    Cleans up notifications older than 90 days.
    """
    from datetime import timedelta
    try:
        cutoff = timezone.now() - timedelta(days=90)
        deleted, _ = Notification.objects.filter(created_at__lt=cutoff, is_read=True).delete()
        return {'status': 'success', 'deleted_count': deleted}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}