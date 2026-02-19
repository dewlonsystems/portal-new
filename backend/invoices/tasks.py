from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
from .models import Invoice
from django.core.files.base import ContentFile

@shared_task
def generate_invoice_pdf(invoice_id):
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        
        html_string = render_to_string('invoices/pdf_invoice.html', {'invoice': invoice})
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        invoice.pdf_file.save(
            f'Invoice_{invoice.reference_code}.pdf',
            ContentFile(pdf_file),
            save=True
        )
        
        return {'status': 'success', 'invoice_id': invoice_id}
        
    except Exception as e:
        print(f"Error generating invoice PDF: {e}")
        return {'status': 'error', 'message': str(e)}

@shared_task
def send_invoice_email(invoice_id):
    try:
        invoice = Invoice.objects.get(id=invoice_id)
        
        subject = f'Invoice - {invoice.reference_code}'
        html_message = render_to_string('invoices/email_invoice.html', {'invoice': invoice})
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [invoice.client_email],
        )
        email.content_subtype = "html"
        
        if invoice.pdf_file:
            email.attach(
                f'Invoice_{invoice.reference_code}.pdf',
                invoice.pdf_file.read(),
                'application/pdf'
            )
        
        email.send()
        
        return {'status': 'success', 'invoice_id': invoice_id}
        
    except Exception as e:
        print(f"Error sending invoice email: {e}")
        return {'status': 'error', 'message': str(e)}

@shared_task
def check_overdue_invoices():
    """
    Celery beat task to check and mark overdue invoices daily.
    """
    from django.utils import timezone
    try:
        overdue = Invoice.objects.filter(
            status__in=['PENDING', 'SENT'],
            due_date__lt=timezone.now()
        )
        for invoice in overdue:
            invoice.mark_overdue()
        return {'status': 'success', 'marked_overdue': overdue.count()}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}