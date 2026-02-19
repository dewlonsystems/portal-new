from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from utils.helpers import generate_reference_code
import string

User = get_user_model()

@shared_task
def send_welcome_email(user_id, email):
    user = User.objects.get(id=user_id)
    temp_password = generate_reference_code('TMP', 8) # Reusing helper with different prefix logic internally if needed, but let's just make random
    # Actually let's make a simple random password for temp
    temp_password = ''.join([chr(random.randint(97, 122)) for _ in range(8)]) + "!" 
    user.set_password(temp_password)
    user.save()
    
    subject = 'Welcome to Portal'
    message = f'Hello {user.first_name},\n\nYour account has been created.\nUsername: {user.username}\nTemporary Password: {temp_password}\n\nPlease log in and change your password immediately.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])

@shared_task
def send_password_reset_email(user_id):
    # Logic for staff requesting reset (notifies admin)
    pass

@shared_task
def send_admin_reset_password_email(user_id):
    user = User.objects.get(id=user_id)
    temp_password = ''.join([chr(random.randint(97, 122)) for _ in range(8)]) + "!"
    user.set_password(temp_password)
    user.must_change_password = True
    user.save()
    
    subject = 'Password Reset by Admin'
    message = f'Hello {user.first_name},\n\nYour password has been reset by an admin.\nTemporary Password: {temp_password}\n\nPlease log in and change your password immediately.'
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])

import random