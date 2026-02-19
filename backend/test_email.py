import os
import django
from django.core.mail import send_mail

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

try:
    send_mail(
        subject='Test Email from Portal',
        message='If you receive this, email is working!',
        from_email=os.environ.get('DEFAULT_FROM_EMAIL'),
        recipient_list=['ontitadmose@gmail.com'],
        fail_silently=False,  # ← Important: raises errors instead of silent failure
    )
    print('✅ Email sent successfully!')
except Exception as e:
    print(f'❌ Email failed: {e}')