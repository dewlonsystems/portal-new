from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
from .models import Receipt
import os
import base64

@shared_task
def generate_receipt_pdf(receipt_id):
    try:
        receipt = Receipt.objects.get(id=receipt_id)
        transaction = receipt.transaction
        
        html_string = render_to_string('receipts/pdf_receipt.html', {
            'receipt': receipt,
            'transaction': transaction,
            'user': transaction.user
        })
        
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        # Save PDF to model
        from django.core.files.base import ContentFile
        receipt.pdf_file.save(
            f'Receipt_{receipt.reference_code}.pdf',
            ContentFile(pdf_file),
            save=True
        )
        
        return {'status': 'success', 'receipt_id': receipt_id}
        
    except Exception as e:
        print(f"Error generating receipt PDF: {e}")
        return {'status': 'error', 'message': str(e)}

@shared_task
def send_receipt_email(receipt_id):
    try:
        receipt = Receipt.objects.get(id=receipt_id)
        transaction = receipt.transaction
        
        subject = f'Payment Receipt - {receipt.reference_code}'
        html_message = render_to_string('receipts/email_receipt.html', {
            'receipt': receipt,
            'transaction': transaction,
            'user': transaction.user
        })
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [transaction.user.email, transaction.email] if transaction.email else [transaction.user.email],
        )
        email.content_subtype = "html"
        
        if receipt.pdf_file:
            email.attach(
                f'Receipt_{receipt.reference_code}.pdf',
                receipt.pdf_file.read(),
                'application/pdf'
            )
        
        email.send()
        receipt.mark_email_sent()
        
        return {'status': 'success', 'receipt_id': receipt_id}
        
    except Exception as e:
        print(f"Error sending receipt email: {e}")
        return {'status': 'error', 'message': str(e)}