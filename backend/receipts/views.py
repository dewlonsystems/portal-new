from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.conf import settings
import os
from .models import Receipt
from .serializers import ReceiptSerializer, ReceiptGenerateSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import generate_receipt_pdf, send_receipt_email
from audit.tasks import log_action
from payments.models import Transaction

User = get_user_model()

class ReceiptListView(generics.ListAPIView):
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Receipt.objects.all()
        return Receipt.objects.filter(transaction__user=user)

class ReceiptDetailView(generics.RetrieveAPIView):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

class ReceiptGenerateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReceiptGenerateSerializer(data=request.data)
        if serializer.is_valid():
            transaction_id = serializer.validated_data['transaction_id']
            
            try:
                transaction = Transaction.objects.get(id=transaction_id)
                
                # Check permissions
                if request.user.role == 'STAFF' and transaction.user != request.user:
                    return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
                
                if transaction.status != 'COMPLETED':
                    return Response({'detail': 'Receipt can only be generated for completed transactions'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if receipt already exists
                try:
                    receipt = Receipt.objects.get(transaction=transaction)
                    return Response(ReceiptSerializer(receipt).data, status=status.HTTP_200_OK)
                except Receipt.DoesNotExist:
                    pass
                
                # Generate receipt
                receipt = Receipt.objects.create(transaction=transaction)
                generate_receipt_pdf.delay(receipt.id)
                
                log_action.delay(
                    request.user.id,
                    'RECEIPT_GENERATED',
                    f'Receipt generated: {receipt.reference_code} for transaction {transaction.reference_code}',
                    metadata={'receipt_id': receipt.id, 'transaction_id': transaction.id}
                )
                
                return Response(ReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)
                
            except Transaction.DoesNotExist:
                return Response({'detail': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReceiptDownloadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, receipt_id):
        try:
            receipt = Receipt.objects.get(id=receipt_id)
            
            # Check permissions
            if request.user.role == 'STAFF' and receipt.transaction.user != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            if not receipt.pdf_file:
                return Response({'detail': 'Receipt PDF not yet generated'}, status=status.HTTP_404_NOT_FOUND)
            
            # Mark as downloaded
            receipt.mark_downloaded(request.user)
            
            log_action.delay(
                request.user.id,
                'RECEIPT_DOWNLOADED',
                f'Receipt downloaded: {receipt.reference_code}',
                metadata={'receipt_id': receipt.id}
            )
            
            # Serve file
            response = FileResponse(
                open(receipt.pdf_file.path, 'rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Receipt_{receipt.reference_code}.pdf"'
            return response
            
        except Receipt.DoesNotExist:
            raise Http404("Receipt not found")

class ReceiptEmailView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, receipt_id):
        try:
            receipt = Receipt.objects.get(id=receipt_id)
            
            # Check permissions
            if request.user.role == 'STAFF' and receipt.transaction.user != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            if not receipt.pdf_file:
                return Response({'detail': 'Receipt PDF not yet generated'}, status=status.HTTP_404_NOT_FOUND)
            
            send_receipt_email.delay(receipt.id)
            
            return Response({'status': 'Receipt email queued for sending'})
            
        except Receipt.DoesNotExist:
            return Response({'detail': 'Receipt not found'}, status=status.HTTP_404_NOT_FOUND)

class TransactionReceiptView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, transaction_id):
        try:
            transaction = Transaction.objects.get(id=transaction_id)
            
            # Check permissions
            if request.user.role == 'STAFF' and transaction.user != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            try:
                receipt = Receipt.objects.get(transaction=transaction)
                return Response(ReceiptSerializer(receipt).data)
            except Receipt.DoesNotExist:
                return Response({'detail': 'Receipt not yet generated for this transaction'}, status=status.HTTP_404_NOT_FOUND)
                
        except Transaction.DoesNotExist:
            return Response({'detail': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)