from django.urls import path
from .views import (
    NotificationListView, NotificationDetailView, NotificationMarkAsReadView,
    NotificationMarkAllAsReadView, AdminNotificationListView, AdminNotificationDetailView,
    AdminNotificationResolveView, AdminNotificationCreateView, UnreadNotificationCountView
)

urlpatterns = [
    path('list/', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('<int:pk>/mark-read/', NotificationMarkAsReadView.as_view(), name='notification-mark-read'),
    path('mark-all-read/', NotificationMarkAllAsReadView.as_view(), name='notification-mark-all-read'),
    path('unread-count/', UnreadNotificationCountView.as_view(), name='unread-count'),
    path('admin/list/', AdminNotificationListView.as_view(), name='admin-notification-list'),
    path('admin/<int:pk>/', AdminNotificationDetailView.as_view(), name='admin-notification-detail'),
    path('admin/<int:pk>/resolve/', AdminNotificationResolveView.as_view(), name='admin-notification-resolve'),
    path('admin/create/', AdminNotificationCreateView.as_view(), name='admin-notification-create'),
]