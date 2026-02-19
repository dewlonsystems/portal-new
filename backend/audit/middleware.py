from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from .models import UserSession
from .tasks import log_action
import re

User = get_user_model()

class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.audit_session_key = request.session.session_key
        
        if request.user.is_authenticated:
            session_key = request.session.session_key
            if session_key:
                UserSession.objects.update_or_create(
                    user=request.user,
                    session_key=session_key,
                    defaults={
                        'ip_address': self.get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', '')[:255],
                        'is_active': True,
                        'last_seen': None,
                    }
                )

    def process_response(self, request, response):
        if request.user.is_authenticated and hasattr(request, 'audit_session_key'):
            session_key = request.audit_session_key
            if session_key:
                UserSession.objects.filter(
                    user=request.user,
                    session_key=session_key
                ).update(
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
                    is_active=True,
                )
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip