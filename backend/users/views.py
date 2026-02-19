from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from .models import LoginAttempt, PasswordResetRequest
from .serializers import UserSerializer, UserCreateSerializer, LoginSerializer, PasswordResetRequestSerializer, ChangePasswordSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import send_welcome_email, send_password_reset_email
from audit.tasks import log_action

User = get_user_model()

class CustomLoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

            if user.check_lockout():
                return Response({'detail': 'Account is temporarily locked due to multiple failed attempts.'}, status=status.HTTP_403_FORBIDDEN)

            user_auth = authenticate(username=username, password=password)
            
            if user_auth:
                user.reset_login_attempts()
                LoginAttempt.objects.create(user=user, success=True, ip_address=self.get_client_ip(request))
                log_action.delay(user.id, "LOGIN", "User logged in successfully")
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'role': user.role,
                    'must_change_password': user.must_change_password,
                    'first_name': user.first_name
                })
            else:
                user.record_failed_login()
                LoginAttempt.objects.create(user=user, success=False, ip_address=self.get_client_ip(request))
                return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class UserListView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        send_welcome_email.delay(user.id, user.email)
        log_action.delay(self.request.user.id, "USER_CREATED", f"Created user {user.username}")

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer

    def perform_destroy(self, instance):
        log_action.delay(self.request.user.id, "USER_DELETED", f"Deleted user {instance.username}")
        super().perform_destroy(instance)

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_object(self):
        return self.request.user

class PasswordResetRequestView(generics.CreateAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Notify admins via task
        from notifications.tasks import notify_admins_password_reset
        notify_admins_password_reset.delay(self.request.user.id)
        log_action.delay(self.request.user.id, "PASSWORD_RESET_REQUEST", "Requested password reset")

class AdminResetPasswordView(generics.UpdateAPIView):
    queryset = PasswordResetRequest.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = PasswordResetRequestSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_resolved = True
        instance.resolved_at = timezone.now()
        instance.admin_note = request.data.get('admin_note', '')
        instance.save()
        
        # Generate temp password and email user
        from users.tasks import send_admin_reset_password_email
        send_admin_reset_password_email.delay(instance.user.id)
        log_action.delay(request.user.id, "PASSWORD_RESET_ADMIN", f"Reset password for {instance.user.username}")
        
        return Response({'status': 'Password reset initiated'})

class ChangePasswordView(generics.UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if user.must_change_password or user.check_password(serializer.validated_data.get('old_password')):
            user.set_password(serializer.validated_data['new_password'])
            user.must_change_password = False
            user.save()
            log_action.delay(user.id, "PASSWORD_CHANGED", "Password changed successfully")
            return Response({'status': 'Password updated'})
        else:
            return Response({'detail': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)