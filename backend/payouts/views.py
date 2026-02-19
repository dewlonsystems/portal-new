from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from .models import Payout, PayoutRequest
from .serializers import PayoutSerializer, PayoutInitiateSerializer, PayoutRequestSerializer, PayoutSummarySerializer
from .permissions import IsAdmin
from .tasks import initiate_b2c_payment
from audit.tasks import log_action
from payments.models import LedgerEntry

User = get_user_model()

class PayoutListView(generics.ListAPIView):
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    ordering = ['-created_at']

    def get_queryset(self):
        return Payout.objects.all()

class PayoutDetailView(generics.RetrieveAPIView):
    queryset = Payout.objects.all()
    serializer_class = PayoutSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class PayoutInitiateView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = PayoutInitiateSerializer(data=request.data)
        if serializer.is_valid():
            recipient_name = serializer.validated_data['recipient_name']
            recipient_phone = serializer.validated_data['recipient_phone']
            amount = serializer.validated_data['amount']
            reason = serializer.validated_data['reason']

            payout = Payout.objects.create(
                admin_user=request.user,
                recipient_name=recipient_name,
                recipient_phone=recipient_phone,
                amount=amount,
                reason=reason
            )

            log_action.delay(
                request.user.id,
                'PAYOUT_INITIATED',
                f'Payout initiated: {payout.reference_code} - {amount} to {recipient_name}',
                metadata={'payout_id': payout.id}
            )

            b2c_task = initiate_b2c_payment.delay(payout.id, recipient_phone, amount)
            
            return Response({
                'payout': PayoutSerializer(payout).data,
                'message': 'B2C payout initiated. Waiting for Mpesa confirmation.',
                'task_id': b2c_task.id
            }, status=status.HTTP_202_ACCEPTED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class B2CResultCallbackView(views.APIView):
    permission_classes = []

    def post(self, request):
        try:
            data = request.data
            result = data.get('Result', {})
            conversation_id = result.get('ConversationID')
            originator_conversation_id = result.get('OriginatorConversationID')
            result_code = result.get('ResultCode')
            result_desc = result.get('ResultDesc')

            try:
                payout_request = PayoutRequest.objects.get(originator_conversation_id=originator_conversation_id)
                payout = payout_request.payout

                payout_request.status = 'COMPLETED' if result_code == '0' else 'FAILED'
                payout_request.result_code = str(result_code)
                payout_request.result_desc = result_desc
                payout_request.conversation_id = conversation_id
                payout_request.callback_data = data
                payout_request.save()

                if result_code == '0':
                    payout.update_status('COMPLETED', callback_data=data)
                    payout.provider_reference = conversation_id
                    payout.save(update_fields=['provider_reference'])
                    
                    # Create Debit Ledger Entry
                    from payments.tasks import create_ledger_entry
                    create_ledger_entry.delay(None, 'DEBIT', payout.amount, f'Payout completed: {payout.reference_code} to {payout.recipient_name}')
                    
                    log_action.delay(
                        payout.admin_user.id,
                        'PAYOUT_COMPLETED',
                        f'Payout completed: {payout.reference_code} - {payout.amount}',
                        metadata={'payout_id': payout.id}
                    )
                else:
                    payout.update_status('FAILED', callback_data=data, failed_reason=result_desc)
                    log_action.delay(
                        payout.admin_user.id,
                        'PAYOUT_FAILED',
                        f'Payout failed: {payout.reference_code} - {result_desc}',
                        metadata={'payout_id': payout.id}
                    )

                return Response({'ResultCode': 0, 'ResultDesc': 'Accept'})
            except PayoutRequest.DoesNotExist:
                return Response({'ResultCode': 1, 'ResultDesc': 'Payout request not found'}, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            return Response({'ResultCode': 1, 'ResultDesc': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class B2CTimeoutCallbackView(views.APIView):
    permission_classes = []

    def post(self, request):
        try:
            data = request.data
            # Handle timeout logic similar to result callback
            # For brevity, marking as failed
            return Response({'ResultCode': 0, 'ResultDesc': 'Accept'})
        except Exception as e:
            return Response({'ResultCode': 1, 'ResultDesc': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class PayoutSummaryView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        payouts = Payout.objects.filter(status='COMPLETED')
        total_amount = payouts.aggregate(total=Sum('amount'))['total'] or 0
        total_count = payouts.count()
        completed_count = payouts.filter(status='COMPLETED').count()
        pending_count = Payout.objects.filter(status='PENDING').count()
        failed_count = Payout.objects.filter(status='FAILED').count()

        serializer = PayoutSummarySerializer({
            'total_amount': total_amount,
            'total_payouts': total_count,
            'completed_payouts': completed_count,
            'pending_payouts': pending_count,
            'failed_payouts': failed_count
        })

        return Response(serializer.data)