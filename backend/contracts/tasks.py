from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML, CSS
from weasyprint.urls import path2url
import os
from pathlib import Path
import base64
from .models import Contract, Invoice
from datetime import timedelta
from django.utils import timezone
from audit.tasks import log_action


def get_director_signature_base64():
    """
    Convert the static director signature PNG to base64 data URI.
    Returns None if file not found (template will fallback).
    """
    try:
        # Try multiple possible locations for the static file
        possible_paths = [
            Path(settings.BASE_DIR) / "static" / "signatures" / "director-signature.png",
            Path(settings.STATIC_ROOT) / "signatures" / "director-signature.png" if hasattr(settings, 'STATIC_ROOT') else None,
            Path(settings.BASE_DIR) / "contracts" / "static" / "signatures" / "director-signature.png",
        ]
        
        for sig_path in possible_paths:
            if sig_path and sig_path.exists():
                with open(sig_path, 'rb') as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                    return f'image/png;base64,{encoded}'
        
        # If not found, log warning but don't crash
        print(f"⚠️ Director signature not found at expected paths: {[str(p) for p in possible_paths if p]}")
        return None
        
    except Exception as e:
        print(f"⚠️ Error loading director signature: {e}")
        return None


@shared_task
def send_contract_email(contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
        subject = f'Contract for Signature - {contract.reference_code}'
        
        # Construct Signing Link
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
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
        
        # Get director signature as base64 for PDF embedding
        director_sig_b64 = get_director_signature_base64()
        
        # Render template with base64 signature in context
        html_string = render_to_string('contracts/pdf_contract.html', {
            'contract': contract,
            'director_signature_b64': director_sig_b64,  # <-- KEY ADDITION
        })
        
        # Configure WeasyPrint to handle local file references if needed
        html = HTML(string=html_string, base_url=settings.BASE_DIR)
        
        # Optional: Add CSS for print optimization
        css = CSS(string='''
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        ''')
        
        pdf_file = html.write_pdf(stylesheets=[css] if css else None)
        
        # Email the signed contract
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
        
        # Log success
        log_action.delay(
            contract.created_by.id,
            'CONTRACT_PDF_GENERATED',
            f'PDF generated for signed contract: {contract.reference_code}',
            metadata={'contract_id': contract.id}
        )
        
    except Exception as e:
        print(f"❌ Error generating contract PDF: {e}")
        # Log the error for debugging
        if hasattr(contract, 'created_by'):
            log_action.delay(
                contract.created_by.id,
                'CONTRACT_PDF_ERROR',
                f'PDF generation failed: {contract.reference_code} - {str(e)}',
                metadata={'contract_id': contract_id, 'error': str(e)}
            )


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
        html = HTML(string=html_string, base_url=settings.BASE_DIR)
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