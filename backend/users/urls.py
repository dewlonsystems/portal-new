from django.urls import path
from .views import CustomLoginView, UserListView, UserDetailView, ProfileView, PasswordResetRequestView, AdminResetPasswordView, ChangePasswordView

urlpatterns = [
    path('login/', CustomLoginView.as_view(), name='login'),
    path('list/', UserListView.as_view(), name='user-list'),
    path('<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('request-reset/', PasswordResetRequestView.as_view(), name='request-reset'),
    path('admin-reset/<int:pk>/', AdminResetPasswordView.as_view(), name='admin-reset'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]