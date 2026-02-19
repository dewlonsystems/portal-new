from celery import shared_task
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
from .models import Quote
import os

@shared_task
def send_quote_email(quote_id):
    try:
        quote = Quote.objects.get(id=quote_id)
        
        # Generate PDF
        html_string = render_to_string('quotes/pdf_quote.html', {'quote': quote})
        html = HTML(string=html_string)
        pdf_file = html.write_pdf()
        
        # Save PDF to model (optional, here we attach directly)
        # quote.pdf_file.save(...) 
        
        subject = f'Service Quote - {quote.reference_code}'
        html_message = render_to_string('quotes/email_quote.html', {'quote': quote})
        
        email = EmailMessage(
            subject,
            html_message,
            settings.DEFAULT_FROM_EMAIL,
            [quote.client_email],
        )
        email.content_subtype = "html"
        email.attach(f'Quote_{quote.reference_code}.pdf', pdf_file, 'application/pdf')
        email.send()
        
        quote.mark_sent()
        
    except Exception as e:
        print(f"Error sending quote email: {e}")