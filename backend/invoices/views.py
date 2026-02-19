from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Invoice
from .serializers import InvoiceSerializer, InvoiceCreateSerializer, InvoiceUpdateStatusSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import generate_invoice_pdf, send_invoice_email
from audit.tasks import log_action

User = get_user_model()

class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Invoice.objects.all()
        return Invoice.objects.filter(created_by=user)

class InvoiceDetailView(generics.RetrieveAPIView):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

class InvoiceCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InvoiceCreateSerializer(data=request.data)
        if serializer.is_valid():
            invoice = Invoice.objects.create(
                created_by=request.user,
                **serializer.validated_data
            )
            
            # Generate PDF
            generate_invoice_pdf.delay(invoice.id)
            
            log_action.delay(
                request.user.id,
                'INVOICE_CREATED',
                f'Invoice created: {invoice.reference_code} for {invoice.client_name}',
                metadata={'invoice_id': invoice.id}
            )

            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InvoiceUpdateStatusView(views.APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
            
            # Check permissions
            if request.user.role == 'STAFF' and invoice.created_by != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = InvoiceUpdateStatusSerializer(data=request.data)
            if serializer.is_valid():
                if serializer.validated_data['status'] == 'PAID':
                    invoice.mark_paid(serializer.validated_data.get('payment_reference'))
                    log_action.delay(
                        request.user.id,
                        'INVOICE_PAID',
                        f'Invoice marked paid: {invoice.reference_code}',
                        metadata={'invoice_id': invoice.id}
                    )
                elif serializer.validated_data['status'] == 'CANCELLED':
                    invoice.mark_cancelled()
                    log_action.delay(
                        request.user.id,
                        'INVOICE_CANCELLED',
                        f'Invoice cancelled: {invoice.reference_code}',
                        metadata={'invoice_id': invoice.id}
                    )
                
                return Response(InvoiceSerializer(invoice).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Invoice.DoesNotExist:
            return Response({'detail': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

class InvoiceSendView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
            
            # Check permissions
            if request.user.role == 'STAFF' and invoice.created_by != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            if not invoice.pdf_file:
                generate_invoice_pdf.delay(invoice.id)
            
            send_invoice_email.delay(invoice.id)
            invoice.mark_sent()
            
            log_action.delay(
                request.user.id,
                'INVOICE_SENT',
                f'Invoice sent: {invoice.reference_code}',
                metadata={'invoice_id': invoice.id}
            )
            
            return Response({'status': 'Invoice queued for sending'})
            
        except Invoice.DoesNotExist:
            return Response({'detail': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

class InvoiceDownloadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
            
            # Check permissions
            if request.user.role == 'STAFF' and invoice.created_by != request.user:
                return Response({'detail': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            
            if not invoice.pdf_file:
                return Response({'detail': 'Invoice PDF not yet generated'}, status=status.HTTP_404_NOT_FOUND)
            
            from django.http import FileResponse
            response = FileResponse(
                open(invoice.pdf_file.path, 'rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.reference_code}.pdf"'
            
            log_action.delay(
                request.user.id,
                'INVOICE_DOWNLOADED',
                f'Invoice downloaded: {invoice.reference_code}',
                metadata={'invoice_id': invoice.id}
            )
            
            return response
            
        except Invoice.DoesNotExist:
            return Response({'detail': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

class OverdueInvoicesView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'ADMIN':
            invoices = Invoice.objects.filter(status__in=['PENDING', 'SENT'], due_date__lt=timezone.now())
        else:
            invoices = Invoice.objects.filter(created_by=user, status__in=['PENDING', 'SENT'], due_date__lt=timezone.now())
        
        for invoice in invoices:
            invoice.mark_overdue()
        
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)