from django.urls import path
from .views import AuditLogListView, AuditLogDetailView, UserSessionListView, UserActiveStatusView, MyAuditLogsView

urlpatterns = [
    path('logs/', AuditLogListView.as_view(), name='audit-log-list'),
    path('logs/<int:pk>/', AuditLogDetailView.as_view(), name='audit-log-detail'),
    path('sessions/', UserSessionListView.as_view(), name='user-session-list'),
    path('active-status/', UserActiveStatusView.as_view(), name='user-active-status'),
    path('my-logs/', MyAuditLogsView.as_view(), name='my-audit-logs'),
]