from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        
        # Handle phone_number for superuser creation (required field)
        if 'phone_number' not in extra_fields or not extra_fields.get('phone_number'):
            extra_fields['phone_number'] = '+254700000000'  # Default superuser phone
        
        return self.create_user(username, email, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
    )
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STAFF')
    phone_number = models.CharField(max_length=15, unique=True)
    is_locked = models.BooleanField(default=False)
    locked_until = models.DateTimeField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    must_change_password = models.BooleanField(default=False)
    
    # Tell Django which fields are required for createsuperuser command
    REQUIRED_FIELDS = ['email', 'phone_number']
    
    # Define the manager
    objects = UserManager()
    
    def __str__(self):
        return self.username

    def is_admin(self):
        return self.role == 'ADMIN'

    def is_staff_user(self):
        return self.role == 'STAFF'

    def check_lockout(self):
        if self.is_locked and self.locked_until:
            if timezone.now() < self.locked_until:
                return True
            else:
                # Lockout expired
                self.is_locked = False
                self.locked_until = None
                self.failed_login_attempts = 0
                self.save(update_fields=['is_locked', 'locked_until', 'failed_login_attempts'])
                return False
        return False

    def record_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 3:
            self.is_locked = True
            self.locked_until = timezone.now() + timedelta(hours=3)
        self.save(update_fields=['failed_login_attempts', 'is_locked', 'locked_until'])

    def reset_login_attempts(self):
        self.failed_login_attempts = 0
        self.is_locked = False
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'is_locked', 'locked_until'])

class LoginAttempt(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_attempts')
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {'Success' if self.success else 'Failed'} - {self.timestamp}"

class PasswordResetRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_requests')
    requested_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.user.username} - {'Resolved' if self.is_resolved else 'Pending'} - {self.requested_at}"