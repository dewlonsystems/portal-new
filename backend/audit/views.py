from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import AuditLog, UserSession
from .serializers import AuditLogSerializer, UserSessionSerializer
from .permissions import IsAdmin
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

User = get_user_model()

class AuditLogListView(generics.ListAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'user', 'ip_address']
    search_fields = ['description', 'user__username', 'user__email']
    ordering_fields = ['timestamp', 'action']
    ordering = ['-timestamp']

class AuditLogDetailView(generics.RetrieveAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class UserSessionListView(generics.ListAPIView):
    queryset = UserSession.objects.filter(is_active=True)
    serializer_class = UserSessionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['user', 'ip_address']
    search_fields = ['user__username', 'user__email']
    ordering_fields = ['last_seen', 'created_at']
    ordering = ['-last_seen']

class UserActiveStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all()
        data = []
        for user in users:
            last_session = UserSession.objects.filter(user=user, is_active=True).order_by('-last_seen').first()
            data.append({
                'user_id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'is_active': last_session.is_active if last_session else False,
                'last_seen': last_session.last_seen if last_session else None,
            })
        return Response(data)

class MyAuditLogsView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-timestamp']

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return AuditLog.objects.all()
        return AuditLog.objects.filter(user=self.request.user)