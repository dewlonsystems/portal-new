from celery import shared_task
from django.conf import settings
import requests
import base64
from datetime import datetime
from .models import Payout, PayoutRequest

@shared_task
def initiate_b2c_payment(payout_id, phone_number, amount):
    """
    Initiates Mpesa B2C Payment
    """
    try:
        payout = Payout.objects.get(id=payout_id)
        
        # 1. Get OAuth Token (Same as STK)
        token_url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        if not settings.DEBUG:
            token_url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        
        credentials = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        token_response = requests.get(
            token_url,
            headers={'Authorization': f'Basic {encoded_credentials}'}
        )
        access_token = token_response.json().get('access_token')

        # 2. B2C Request
        b2c_url = 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
        if not settings.DEBUG:
            b2c_url = 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'

        # Security Credential should be pre-generated and stored in ENV for production
        security_credential = settings.MPESA_B2C_SECURITY_CREDENTIAL

        payload = {
            "ShortCode": settings.MPESA_B2C_SHORTCODE,
            "CommandID": "SalaryPayment", # Or BusinessPayment, PromotionPayment
            "Amount": int(amount),
            "PartyA": settings.MPESA_B2C_SHORTCODE,
            "PartyB": phone_number,
            "Remarks": payout.reason,
            "QueueTimeOutURL": settings.MPESA_B2C_TIMEOUT_URL,
            "ResultURL": settings.MPESA_B2C_RESULT_URL,
            "Occasion": "Payout",
            "SecurityCredential": security_credential,
            "InitiatorName": settings.MPESA_B2C_INITIATOR_NAME
        }

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        response = requests.post(b2c_url, json=payload, headers=headers)
        response_data = response.json()

        if response_data.get('ResponseCode') == '0':
            payout_request = PayoutRequest.objects.create(
                payout=payout,
                conversation_id=response_data.get('ConversationID'),
                originator_conversation_id=response_data.get('OriginatorConversationID'),
                status='PROCESSING',
                response_code=response_data.get('ResponseCode'),
                response_description=response_data.get('ResponseDescription')
            )
            payout.status = 'PROCESSING'
            payout.conversation_id = response_data.get('ConversationID')
            payout.save()
            return {'status': 'success', 'data': response_data}
        else:
            payout.update_status('FAILED', failed_reason=response_data.get('ResponseDescription'))
            return {'status': 'error', 'message': response_data.get('ResponseDescription')}

    except Exception as e:
        payout = Payout.objects.get(id=payout_id)
        payout.update_status('FAILED', failed_reason=str(e))
        return {'status': 'error', 'message': str(e)}