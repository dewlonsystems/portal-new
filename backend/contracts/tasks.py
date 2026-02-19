from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
import os
from .models import Contract, Invoice
from datetime import timedelta
from django.utils import timezone
import base64

@shared_task
def send_contract_email(contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
        subject = f'Contract for Signature - {contract.reference_code}'
        
        # Construct Signing Link
        base_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:5173'
        signing_link = f"{base_url}/sign-contract/{contract.signing_token}/"
        
        html_message = render_to_string('contracts/email_contract.html', {
            'contract': contract,
            'signing_link': signing_link
        })
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [contract.client_email],
        )
        email.content_subtype = "html"
        email.send()
        
        contract.status = 'SENT'
        contract.save(update_fields=['status', 'updated_at'])
        
    except Exception as e:
        print(f"Error sending contract email: {e}")

@shared_task
def generate_signed_contract_pdf(contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
        html_string = render_to_string('contracts/pdf_contract.html', {'contract': contract})
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        # Save PDF to media or send via email
        # For this implementation, we will email it
        subject = f'Signed Contract - {contract.reference_code}'
        html_message = render_to_string('contracts/email_signed_contract.html', {'contract': contract})
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [contract.client_email, contract.created_by.email],
        )
        email.content_subtype = "html"
        email.attach(f'Contract_{contract.reference_code}.pdf', pdf_file, 'application/pdf')
        email.send()
        
    except Exception as e:
        print(f"Error generating contract PDF: {e}")

@shared_task
def generate_invoice_pdf(contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
        
        # Create Invoice
        invoice = Invoice.objects.create(
            contract=contract,
            client_name=contract.client_name,
            client_email=contract.client_email,
            client_phone=contract.client_phone,
            service_description=contract.service_description,
            amount=contract.amount,
            due_date=timezone.now() + timedelta(hours=72)
        )
        
        html_string = render_to_string('contracts/pdf_invoice.html', {'invoice': invoice})
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        subject = f'Invoice - {invoice.reference_code}'
        html_message = render_to_string('contracts/email_invoice.html', {'invoice': invoice})
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [invoice.client_email],
        )
        email.content_subtype = "html"
        email.attach(f'Invoice_{invoice.reference_code}.pdf', pdf_file, 'application/pdf')
        email.send()
        
        log_action.delay(contract.created_by.id, 'INVOICE_CREATED', f'Invoice generated: {invoice.reference_code}')
        log_action.delay(contract.created_by.id, 'INVOICE_SENT', f'Invoice sent: {invoice.reference_code}')
        
    except Exception as e:
        print(f"Error generating invoice PDF: {e}")

from audit.tasks import log_action
