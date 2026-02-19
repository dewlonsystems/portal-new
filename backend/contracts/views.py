from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.files.base import ContentFile
from pathlib import Path
import base64

from .models import Contract, Invoice
from .serializers import (
    ContractSerializer, ContractCreateSerializer, ContractSignSerializer,
    InvoiceSerializer, ContractPublicViewSerializer
)
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import send_contract_email, generate_signed_contract_pdf, generate_invoice_pdf
from audit.tasks import log_action

User = get_user_model()


def get_static_image_base64(relative_path):
    """
    Convert a static file to base64 data URI for PDF embedding.
    Use this if you need to pass static images from views to templates.
    Returns None if file not found.
    """
    try:
        possible_paths = [
            Path(settings.BASE_DIR) / "static" / relative_path,
            Path(settings.STATIC_ROOT) / relative_path if hasattr(settings, 'STATIC_ROOT') else None,
        ]
        
        for file_path in possible_paths:
            if file_path and file_path.exists():
                with open(file_path, 'rb') as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                    ext = file_path.suffix.lstrip('.').lower()
                    mime_type = f"image/{'png' if ext == 'png' else 'jpeg'}"
                    return f"{mime_type};base64,{encoded}"
        return None
    except Exception:
        return None


class ContractListView(generics.ListAPIView):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Contract.objects.all().order_by('-created_at')
        return Contract.objects.filter(created_by=user).order_by('-created_at')


class ContractDetailView(generics.RetrieveAPIView):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]


class ContractCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ContractCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            contract = Contract.objects.create(
                created_by=request.user,
                **serializer.validated_data
            )
            
            # Send Email with Tokenized Link
            send_contract_email.delay(contract.id)
            
            log_action.delay(
                request.user.id,
                'CONTRACT_CREATED',
                f'Contract created: {contract.reference_code} for {contract.client_name}',
                metadata={'contract_id': contract.id}
            )

            return Response(ContractSerializer(contract).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContractPublicView(views.APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            contract = Contract.objects.get(signing_token=token)
            
            if contract.status == 'SIGNED':
                return Response({'detail': 'Contract already signed'}, status=status.HTTP_400_BAD_REQUEST)
            
            if contract.expires_at < timezone.now():
                contract.status = 'EXPIRED'
                contract.save(update_fields=['status'])
                return Response({'detail': 'Contract link expired'}, status=status.HTTP_410_GONE)
            
            contract.mark_viewed()
            return Response(ContractPublicViewSerializer(contract).data)
        
        except Contract.DoesNotExist:
            return Response({'detail': 'Invalid contract link'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContractSignView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            contract = Contract.objects.get(signing_token=token)
            
            if contract.status == 'SIGNED':
                return Response({'detail': 'Contract already signed'}, status=status.HTTP_400_BAD_REQUEST)
            
            if contract.expires_at < timezone.now():
                contract.status = 'EXPIRED'
                contract.save(update_fields=['status'])
                return Response({'detail': 'Contract link expired'}, status=status.HTTP_410_GONE)

            serializer = ContractSignSerializer(data=request.data)
            if serializer.is_valid():
                # Process Signature Image (base64 from frontend)
                signature_data = serializer.validated_data['signature_image']
                
                if ';base64,' in signature_data:
                    try:
                        format, imgstr = signature_data.split(';base64,')
                        ext = format.split('/')[-1].lower()
                        # Validate extension
                        if ext not in ['png', 'jpg', 'jpeg', 'gif']:
                            ext = 'png'
                        data = ContentFile(
                            base64.b64decode(imgstr), 
                            name=f'signature_{contract.id}.{ext}'
                        )
                    except Exception as e:
                        return Response({'detail': f'Invalid signature data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({'detail': 'Invalid signature format. Expected base64 data URI.'}, status=status.HTTP_400_BAD_REQUEST)

                contract.mark_signed(
                    signature_image=data,
                    place_of_signing=serializer.validated_data['place_of_signing'],
                    ip_address=self.get_client_ip(request)
                )

                # Generate PDFs and Invoice (async)
                generate_signed_contract_pdf.delay(contract.id)
                generate_invoice_pdf.delay(contract.id)

                log_action.delay(
                    contract.created_by.id,
                    'CONTRACT_SIGNED',
                    f'Contract signed: {contract.reference_code} by {contract.client_name}',
                    metadata={'contract_id': contract.id}
                )

                return Response({'status': 'Contract signed successfully', 'reference_code': contract.reference_code})
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        except Contract.DoesNotExist:
            return Response({'detail': 'Invalid contract link'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'detail': f'Server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Invoice.objects.all().order_by('-created_at')
        return Invoice.objects.filter(contract__created_by=user).order_by('-created_at')


class InvoiceDetailView(generics.RetrieveAPIView):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]