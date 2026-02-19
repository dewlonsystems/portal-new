from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from .models import VerificationLog
from .serializers import VerificationRequestSerializer, VerificationResponseSerializer, VerificationLogSerializer
from audit.tasks import log_action
from django.apps import apps

class VerifyDocumentView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerificationRequestSerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['document_code'].upper()
            ip_address = self.get_client_ip(request)
            
            result = self.verify_code(code)
            
            # Log Verification
            VerificationLog.objects.create(
                document_code=code,
                ip_address=ip_address,
                is_valid=result['is_valid'],
                document_type=result.get('document_type'),
            )

            if result['is_valid']:
                log_action.delay(None, 'DOCUMENT_VERIFIED', f'Document verified: {code}', ip_address=ip_address)
            else:
                log_action.delay(None, 'DOCUMENT_VERIFICATION_FAILED', f'Invalid document: {code}', ip_address=ip_address)

            return Response(VerificationResponseSerializer(result).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def verify_code(self, code):
        # Validate Format (Prefix + 8 chars = 10 chars total usually, but DP is 2 + 8 = 10)
        if len(code) < 10:
            return {
                'is_valid': False,
                'document_type': 'Unknown',
                'document_code': code,
                'date_of_issue': None,
                'issuing_user': None,
                'message': 'Invalid document code format.'
            }

        prefix = code[:2]
        result = {
            'is_valid': False,
            'document_type': 'Unknown',
            'document_code': code,
            'date_of_issue': None,
            'issuing_user': None,
            'message': 'Document not found or invalid.'
        }

        try:
            if prefix == 'DP': # Payment Transaction
                Transaction = apps.get_model('payments', 'Transaction')
                obj = Transaction.objects.filter(reference_code=code, status='COMPLETED').first()
                if obj:
                    result['is_valid'] = True
                    result['document_type'] = 'Payment Receipt'
                    result['date_of_issue'] = obj.completed_at
                    result['issuing_user'] = obj.user.username
                    result['message'] = 'Document is valid.'
            
            elif prefix == 'DD': # Payout
                Payout = apps.get_model('payouts', 'Payout')
                obj = Payout.objects.filter(reference_code=code, status='COMPLETED').first()
                if obj:
                    result['is_valid'] = True
                    result['document_type'] = 'Payout Receipt'
                    result['date_of_issue'] = obj.completed_at
                    result['issuing_user'] = obj.admin_user.username
                    result['message'] = 'Document is valid.'

            elif prefix == 'DQ': # Quote
                Quote = apps.get_model('quotes', 'Quote')
                obj = Quote.objects.filter(reference_code=code).first()
                if obj:
                    result['is_valid'] = True
                    result['document_type'] = 'Service Quote'
                    result['date_of_issue'] = obj.created_at
                    result['issuing_user'] = obj.created_by.username
                    result['message'] = 'Document is valid.'

            elif prefix == 'DV': # Invoice
                Invoice = apps.get_model('contracts', 'Invoice')
                obj = Invoice.objects.filter(reference_code=code).first()
                if obj:
                    result['is_valid'] = True
                    result['document_type'] = 'Invoice'
                    result['date_of_issue'] = obj.created_at
                    result['issuing_user'] = obj.contract.created_by.username if obj.contract else 'System'
                    result['message'] = 'Document is valid.'
            
            elif prefix == 'DC': # Contract
                Contract = apps.get_model('contracts', 'Contract')
                obj = Contract.objects.filter(reference_code=code, status='SIGNED').first()
                if obj:
                    result['is_valid'] = True
                    result['document_type'] = 'Signed Contract'
                    result['date_of_issue'] = obj.signed_at
                    result['issuing_user'] = obj.created_by.username
                    result['message'] = 'Document is valid.'

        except Exception as e:
            result['message'] = f'Verification error: {str(e)}'

        return result

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class VerificationLogListView(generics.ListAPIView):
    serializer_class = VerificationLogSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-verified_at']

    def get_queryset(self):
        return VerificationLog.objects.all()