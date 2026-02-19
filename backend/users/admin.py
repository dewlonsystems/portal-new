from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LoginAttempt, PasswordResetRequest

class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'is_locked', 'date_joined')
    list_filter = ('role', 'is_locked', 'is_staff')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number', 'is_locked', 'locked_until', 'must_change_password')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Additional Info', {'fields': ('role', 'phone_number')}),
    )

admin.site.register(User, UserAdmin)
admin.site.register(LoginAttempt)
admin.site.register(PasswordResetRequest)