# tasks.py
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
    Convert static director signature PNG to full base64 data URI.
    Works with local static files or collected static files.
    
    Returns: 'data:image/png;base64,...' or None if not found
    """
    try:
        possible_paths = [
            Path(settings.BASE_DIR) / "static" / "signatures" / "director-signature.png",
            Path(settings.STATIC_ROOT) / "signatures" / "director-signature.png" if hasattr(settings, 'STATIC_ROOT') else None,
            Path(settings.BASE_DIR) / "contracts" / "static" / "signatures" / "director-signature.png",
        ]
        
        for sig_path in possible_paths:
            if sig_path and sig_path.exists():
                with open(sig_path, 'rb') as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                    # ✅ CRITICAL: Return full data URI with 'data:' prefix
                    return f'data:image/png;base64,{encoded}'
        
        print(f"⚠️ Director signature not found at expected paths")
        return None
        
    except Exception as e:
        print(f"❌ Error loading director signature: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_user_signature_base64(contract):
    """
    Convert contract's user signature (ImageField/FileField) to full base64 data URI.
    
    Works with:
    - Local file storage (MEDIA_ROOT)
    - Amazon S3 via django-storages
    - Any Django storage backend
    
    Returns: 'data:image/png;base64,...' or None if signature doesn't exist
    """
    try:
        if not contract.signature_image:
            return None
        
        # Read file content - Django storage backend handles local/S3 transparently
        contract.signature_image.open('rb')
        image_data = contract.signature_image.read()
        contract.signature_image.close()
        
        # Encode binary data to base64 string
        encoded = base64.b64encode(image_data).decode('utf-8')
        
        # Determine MIME type from file extension
        ext = Path(contract.signature_image.name).suffix.lstrip('.').lower()
        mime_type = 'image/png' if ext == 'png' else 'image/jpeg'
        
        # ✅ Return full data URI with 'data:' prefix
        return f'{mime_type};base64,{encoded}'
    
    except Exception as e:
        print(f"❌ Error converting user signature to base64: {e}")
        import traceback
        traceback.print_exc()
        return None


@shared_task
def send_contract_email(contract_id):
    """Send contract signing email with tokenized link."""
    try:
        contract = Contract.objects.get(id=contract_id)
        subject = f'Contract for Signature - {contract.reference_code}'
        
        # Construct Signing Link - uses FRONTEND_URL from settings
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
        
        # Update contract status
        contract.status = 'SENT'
        contract.save(update_fields=['status', 'updated_at'])
        
    except Contract.DoesNotExist:
        print(f"❌ Contract {contract_id} not found for email sending")
    except Exception as e:
        print(f"❌ Error sending contract email: {e}")
        import traceback
        traceback.print_exc()


@shared_task
def generate_signed_contract_pdf(contract_id):
    """
    Generate PDF of signed contract with embedded signatures.
    Sends PDF via email to client and contract creator.
    
    Uses base64 data URIs for signatures - works on EC2, with S3, or any storage.
    """
    try:
        contract = Contract.objects.get(id=contract_id)
        
        # --- Get both signatures as full base64 data URIs ---
        director_sig_b64 = get_director_signature_base64()
        user_sig_b64 = get_user_signature_base64(contract)
        
        # Debug logging (helpful for troubleshooting, safe to keep in production)
        print(f"🔍 PDF Generation for Contract #{contract.id} ({contract.reference_code})")
        print(f"   Director signature: {'✅' if director_sig_b64 else '❌'} ({len(director_sig_b64) if director_sig_b64 else 0} chars)")
        print(f"   User signature: {'✅' if user_sig_b64 else '❌'} ({len(user_sig_b64) if user_sig_b64 else 0} chars)")
        
        # --- Render HTML template with base64 signatures ---
        html_string = render_to_string('contracts/pdf_contract.html', {
            'contract': contract,
            'director_signature_b64': director_sig_b64,  # Full data URI: 'data:image/png;base64,...'
            'user_signature_b64': user_sig_b64,          # Full data URI: 'data:image/png;base64,...'
        })
        
        # --- Configure WeasyPrint ---
        # base_url helps resolve any relative references in the HTML/CSS
        html = HTML(string=html_string, base_url=str(Path(settings.BASE_DIR).resolve()))
        
        # Print-optimized CSS
        css = CSS(string='''
            @page { 
                size: A4; 
                margin: 0; 
            }
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                font-size: 10.5pt;
            }
            img { 
                max-width: 100%; 
                height: auto; 
            }
        ''')
        
        # Generate PDF binary
        pdf_file = html.write_pdf(stylesheets=[css])
        print(f"✅ PDF generated: {len(pdf_file)} bytes")
        
        # --- Email the signed contract ---
        subject = f'Signed Contract - {contract.reference_code}'
        html_message = render_to_string('contracts/email_signed_contract.html', {
            'contract': contract
        })
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [contract.client_email, contract.created_by.email],
        )
        email.content_subtype = "html"
        email.attach(f'Contract_{contract.reference_code}.pdf', pdf_file, 'application/pdf')
        email.send()
        print(f"✅ Contract PDF emailed to {contract.client_email} and {contract.created_by.email}")
        
        # --- Log success ---
        log_action.delay(
            contract.created_by.id,
            'CONTRACT_PDF_GENERATED',
            f'PDF generated and sent for signed contract: {contract.reference_code}',
            metadata={
                'contract_id': contract.id,
                'pdf_size_bytes': len(pdf_file),
                'director_sig_included': bool(director_sig_b64),
                'user_sig_included': bool(user_sig_b64)
            }
        )
        
    except Contract.DoesNotExist:
        print(f"❌ Contract {contract_id} not found for PDF generation")
    except Exception as e:
        print(f"❌ Error generating contract PDF: {e}")
        import traceback
        traceback.print_exc()
        
        # Log error if we have contract context
        if 'contract' in locals() and hasattr(contract, 'created_by'):
            log_action.delay(
                contract.created_by.id,
                'CONTRACT_PDF_ERROR',
                f'PDF generation failed: {contract.reference_code} - {str(e)}',
                metadata={
                    'contract_id': contract_id,
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            )


@shared_task
def generate_invoice_pdf(contract_id):
    """Generate and email invoice PDF for a contract."""
    try:
        contract = Contract.objects.get(id=contract_id)
        
        # Create Invoice record
        invoice = Invoice.objects.create(
            contract=contract,
            client_name=contract.client_name,
            client_email=contract.client_email,
            client_phone=contract.client_phone,
            service_description=contract.service_description,
            amount=contract.amount,
            due_date=timezone.now() + timedelta(hours=72)
        )
        
        # Generate PDF
        html_string = render_to_string('contracts/pdf_invoice.html', {'invoice': invoice})
        html = HTML(string=html_string, base_url=str(Path(settings.BASE_DIR).resolve()))
        pdf_file = html.write_pdf()
        
        # Email invoice
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
        
        # Log actions
        log_action.delay(contract.created_by.id, 'INVOICE_CREATED', f'Invoice generated: {invoice.reference_code}')
        log_action.delay(contract.created_by.id, 'INVOICE_SENT', f'Invoice sent: {invoice.reference_code}')
        
    except Contract.DoesNotExist:
        print(f"❌ Contract {contract_id} not found for invoice generation")
    except Exception as e:
        print(f"❌ Error generating invoice PDF: {e}")
        import traceback
        traceback.print_exc()