from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q, Count
from django.utils import timezone
from .models import Transaction, MpesaSTKRequest, PaystackTransaction, LedgerEntry
from .serializers import (
    TransactionSerializer, TransactionInitiateSerializer,
    MpesaSTKSerializer, PaystackTransactionSerializer,
    LedgerEntrySerializer, TransactionSummarySerializer
)
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import (
    initiate_mpesa_stk, verify_mpesa_payment,
    initiate_paystack_payment, verify_paystack_payment,
    create_ledger_entry
)
from audit.tasks import log_action
import requests
import json
from django.conf import settings

User = get_user_model()

class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Transaction.objects.all()
        return Transaction.objects.filter(user=user)

class TransactionDetailView(generics.RetrieveAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    lookup_field = 'reference_code'

class TransactionInitiateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionInitiateSerializer(data=request.data)
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            payment_method = serializer.validated_data['payment_method']
            phone_number = serializer.validated_data.get('phone_number')
            email = serializer.validated_data.get('email')
            description = serializer.validated_data.get('description', '')

            transaction = Transaction.objects.create(
                user=request.user,
                amount=amount,
                payment_method=payment_method,
                phone_number=phone_number,
                email=email,
                description=description
            )

            log_action.delay(
                request.user.id,
                'PAYMENT_INITIATED',
                f'Payment initiated: {transaction.reference_code} - {amount}',
                metadata={'transaction_id': transaction.id, 'payment_method': payment_method}
            )

            if payment_method == 'MPESA':
                mpesa_task = initiate_mpesa_stk.delay(transaction.id, phone_number, amount)
                return Response({
                    'transaction': TransactionSerializer(transaction).data,
                    'message': 'Mpesa STK push initiated. Please check your phone.',
                    'task_id': mpesa_task.id
                }, status=status.HTTP_202_ACCEPTED)
            
            elif payment_method == 'PAYSTACK':
                paystack_task = initiate_paystack_payment.delay(transaction.id, email, amount)
                return Response({
                    'transaction': TransactionSerializer(transaction).data,
                    'message': 'Paystack payment initiated.',
                    'task_id': paystack_task.id
                }, status=status.HTTP_202_ACCEPTED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TransactionStatusView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reference_code):
        try:
            transaction = Transaction.objects.get(reference_code=reference_code)
            if request.user.role == 'STAFF' and transaction.user != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            data = TransactionSerializer(transaction).data
            
            if transaction.payment_method == 'MPESA':
                try:
                    stk = MpesaSTKRequest.objects.get(transaction=transaction)
                    data['mpesa_status'] = MpesaSTKSerializer(stk).data
                except MpesaSTKRequest.DoesNotExist:
                    data['mpesa_status'] = None
            elif transaction.payment_method == 'PAYSTACK':
                try:
                    paystack = PaystackTransaction.objects.get(transaction=transaction)
                    data['paystack_status'] = PaystackTransactionSerializer(paystack).data
                except PaystackTransaction.DoesNotExist:
                    data['paystack_status'] = None
            
            return Response(data)
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

class MpesaCallbackView(views.APIView):
    permission_classes = []

    def post(self, request):
        try:
            data = request.data
            stk_callback = data.get('Body', {}).get('stkCallback', {})
            checkout_request_id = stk_callback.get('CheckoutRequestID')
            result_code = stk_callback.get('ResultCode')
            result_desc = stk_callback.get('ResultDesc')

            try:
                stk_request = MpesaSTKRequest.objects.get(checkout_request_id=checkout_request_id)
                transaction = stk_request.transaction

                stk_request.status = 'COMPLETED' if result_code == '0' else 'FAILED'
                stk_request.result_code = str(result_code)
                stk_request.result_desc = result_desc
                stk_request.callback_data = data
                stk_request.save()

                if result_code == '0':
                    transaction.update_status('COMPLETED', callback_data=data)
                    create_ledger_entry.delay(transaction.id, 'CREDIT', transaction.amount, f'Payment completed: {transaction.reference_code}')
                    log_action.delay(
                        transaction.user.id,
                        'PAYMENT_COMPLETED',
                        f'Payment completed: {transaction.reference_code} - {transaction.amount}',
                        metadata={'transaction_id': transaction.id}
                    )
                else:
                    transaction.update_status('FAILED', callback_data=data, failed_reason=result_desc)
                    log_action.delay(
                        transaction.user.id,
                        'PAYMENT_FAILED',
                        f'Payment failed: {transaction.reference_code} - {result_desc}',
                        metadata={'transaction_id': transaction.id}
                    )

                return Response({'status': 'success'})
            except MpesaSTKRequest.DoesNotExist:
                return Response({'status': 'error', 'message': 'STK request not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PaystackWebhookView(views.APIView):
    permission_classes = []

    def post(self, request):
        try:
            event = request.data.get('event')
            data = request.data.get('data', {})

            if event == 'charge.success':
                reference = data.get('reference')
                try:
                    paystack_tx = PaystackTransaction.objects.get(reference=reference)
                    transaction = paystack_tx.transaction

                    paystack_tx.status = 'COMPLETED'
                    paystack_tx.gateway_response = data.get('gateway_response', '')
                    paystack_tx.paid_at = timezone.now()
                    paystack_tx.channel = data.get('channel', '')
                    paystack_tx.save()

                    transaction.update_status('COMPLETED', callback_data=data)
                    create_ledger_entry.delay(transaction.id, 'CREDIT', transaction.amount, f'Payment completed: {transaction.reference_code}')
                    log_action.delay(
                        transaction.user.id,
                        'PAYMENT_COMPLETED',
                        f'Payment completed: {transaction.reference_code} - {transaction.amount}',
                        metadata={'transaction_id': transaction.id}
                    )

                    return Response({'status': 'success'})
                except PaystackTransaction.DoesNotExist:
                    return Response({'status': 'error', 'message': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

            elif event == 'charge.failed':
                reference = data.get('reference')
                try:
                    paystack_tx = PaystackTransaction.objects.get(reference=reference)
                    transaction = paystack_tx.transaction

                    paystack_tx.status = 'FAILED'
                    paystack_tx.gateway_response = data.get('gateway_response', '')
                    paystack_tx.save()

                    transaction.update_status('FAILED', callback_data=data, failed_reason=data.get('gateway_response', 'Payment failed'))
                    log_action.delay(
                        transaction.user.id,
                        'PAYMENT_FAILED',
                        f'Payment failed: {transaction.reference_code}',
                        metadata={'transaction_id': transaction.id}
                    )

                    return Response({'status': 'success'})
                except PaystackTransaction.DoesNotExist:
                    return Response({'status': 'error', 'message': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)

            return Response({'status': 'ignored'})
        except Exception as e:
            return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class TransactionSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if user.role == 'ADMIN':
            transactions = Transaction.objects.filter(status='COMPLETED')
        else:
            transactions = Transaction.objects.filter(user=user, status='COMPLETED')

        total_amount = transactions.aggregate(total=Sum('amount'))['total'] or 0
        total_count = transactions.count()
        completed_count = transactions.filter(status='COMPLETED').count()
        pending_count = Transaction.objects.filter(user=user, status='PENDING').count() if user.role == 'STAFF' else Transaction.objects.filter(status='PENDING').count()
        failed_count = transactions.filter(status='FAILED').count()

        serializer = TransactionSummarySerializer({
            'total_amount': total_amount,
            'total_transactions': total_count,
            'completed_transactions': completed_count,
            'pending_transactions': pending_count,
            'failed_transactions': failed_count
        })

        return Response(serializer.data)

class LedgerEntryListView(generics.ListAPIView):
    serializer_class = LedgerEntrySerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    ordering = ['-created_at']

    def get_queryset(self):
        return LedgerEntry.objects.all()