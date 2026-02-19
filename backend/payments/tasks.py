from celery import shared_task
from django.conf import settings
import requests
import base64
from datetime import datetime
from utils.helpers import generate_reference_code
from .models import Transaction, MpesaSTKRequest, PaystackTransaction, LedgerEntry
import hashlib
import time

@shared_task
def initiate_mpesa_stk(transaction_id, phone_number, amount):
    """
    Initiates Mpesa STK Push payment
    """
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        
        # Get Mpesa access token
        token_url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        if settings.DEBUG == False:
            token_url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        
        credentials = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        token_response = requests.get(
            token_url,
            headers={'Authorization': f'Basic {encoded_credentials}'}
        )
        access_token = token_response.json().get('access_token')

        # Generate password
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
        ).decode()

        # STK Push request
        stk_url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        if settings.DEBUG == False:
            stk_url = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

        stk_payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone_number,
            "CallBackURL": "https://your-domain.com/api/payments/mpesa/callback/",
            "AccountReference": transaction.reference_code,
            "TransactionDesc": "Payment for Portal"
        }

        stk_response = requests.post(
            stk_url,
            json=stk_payload,
            headers={'Authorization': f'Bearer {access_token}'}
        )

        response_data = stk_response.json()

        stk_request = MpesaSTKRequest.objects.create(
            transaction=transaction,
            checkout_request_id=response_data.get('CheckoutRequestID'),
            merchant_request_id=response_data.get('MerchantRequestID'),
            status='PROCESSING',
            response_code=response_data.get('ResponseCode'),
            response_description=response_data.get('ResponseDescription')
        )

        return {
            'status': 'success',
            'checkout_request_id': response_data.get('CheckoutRequestID'),
            'stk_request_id': stk_request.id
        }

    except Exception as e:
        transaction = Transaction.objects.get(id=transaction_id)
        transaction.update_status('FAILED', failed_reason=str(e))
        return {'status': 'error', 'message': str(e)}

@shared_task
def verify_mpesa_payment(transaction_id):
    """
    Verifies Mpesa payment status by querying STK status
    """
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        stk_request = MpesaSTKRequest.objects.get(transaction=transaction)

        # Get access token
        token_url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        if settings.DEBUG == False:
            token_url = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        
        credentials = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        
        token_response = requests.get(
            token_url,
            headers={'Authorization': f'Basic {encoded_credentials}'}
        )
        access_token = token_response.json().get('access_token')

        # Query STK status
        query_url = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
        if settings.DEBUG == False:
            query_url = 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
        ).decode()

        query_payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": stk_request.checkout_request_id
        }

        query_response = requests.post(
            query_url,
            json=query_payload,
            headers={'Authorization': f'Bearer {access_token}'}
        )

        response_data = query_response.json()
        result_code = response_data.get('ResultCode')

        if result_code == '0':
            transaction.update_status('COMPLETED', callback_data=response_data)
            create_ledger_entry.delay(transaction.id, 'CREDIT', transaction.amount, f'Payment completed: {transaction.reference_code}')
        elif result_code in ['1032', '1037']:
            transaction.update_status('FAILED', callback_data=response_data, failed_reason=response_data.get('ResultDesc'))

        return {'status': 'success', 'data': response_data}

    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def initiate_paystack_payment(transaction_id, email, amount):
    """
    Initiates Paystack payment
    """
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        
        url = 'https://api.paystack.co/transaction/initialize'
        if settings.DEBUG == False:
            url = 'https://api.paystack.co/transaction/initialize'

        headers = {
            'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }

        payload = {
            'email': email,
            'amount': int(amount) * 100,  # Paystack expects amount in kobo
            'reference': transaction.reference_code,
            'metadata': {
                'transaction_id': transaction.id,
                'user_id': transaction.user.id
            }
        }

        response = requests.post(url, json=payload, headers=headers)
        response_data = response.json()

        if response_data.get('status'):
            paystack_tx = PaystackTransaction.objects.create(
                transaction=transaction,
                reference=transaction.reference_code,
                authorization_url=response_data['data']['authorization_url'],
                access_code=response_data['data']['access_code'],
                status='PROCESSING'
            )

            return {
                'status': 'success',
                'authorization_url': response_data['data']['authorization_url'],
                'reference': transaction.reference_code,
                'paystack_tx_id': paystack_tx.id
            }
        else:
            transaction.update_status('FAILED', failed_reason=response_data.get('message'))
            return {'status': 'error', 'message': response_data.get('message')}

    except Exception as e:
        transaction = Transaction.objects.get(id=transaction_id)
        transaction.update_status('FAILED', failed_reason=str(e))
        return {'status': 'error', 'message': str(e)}

@shared_task
def verify_paystack_payment(reference):
    """
    Verifies Paystack payment status
    """
    try:
        url = f'https://api.paystack.co/transaction/verify/{reference}'
        headers = {
            'Authorization': f'Bearer {settings.PAYSTACK_SECRET_KEY}',
            'Content-Type': 'application/json'
        }

        response = requests.get(url, headers=headers)
        response_data = response.json()

        if response_data.get('status'):
            data = response_data.get('data', {})
            status = data.get('status')
            
            paystack_tx = PaystackTransaction.objects.get(reference=reference)
            transaction = paystack_tx.transaction

            if status == 'success':
                paystack_tx.status = 'COMPLETED'
                paystack_tx.gateway_response = data.get('gateway_response', '')
                paystack_tx.paid_at = datetime.now()
                paystack_tx.channel = data.get('channel', '')
                paystack_tx.save()

                transaction.update_status('COMPLETED', callback_data=data)
                create_ledger_entry.delay(transaction.id, 'CREDIT', transaction.amount, f'Payment completed: {transaction.reference_code}')
            else:
                paystack_tx.status = 'FAILED'
                paystack_tx.gateway_response = data.get('gateway_response', '')
                paystack_tx.save()

                transaction.update_status('FAILED', callback_data=data, failed_reason=data.get('gateway_response'))

            return {'status': 'success', 'data': data}

        return {'status': 'error', 'message': response_data.get('message')}

    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@shared_task
def create_ledger_entry(transaction_id, entry_type, amount, description):
    """
    Creates an immutable ledger entry for a transaction
    """
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        
        # Calculate balance after
        last_entry = LedgerEntry.objects.filter(entry_type=entry_type).order_by('-created_at').first()
        balance_after = last_entry.balance_after + amount if last_entry else amount

        LedgerEntry.objects.create(
            transaction=transaction,
            entry_type=entry_type,
            amount=amount,
            balance_after=balance_after,
            description=description
        )

        return {'status': 'success', 'ledger_entry_created': True}

    except Exception as e:
        return {'status': 'error', 'message': str(e)}