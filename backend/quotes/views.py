from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .models import Quote
from .serializers import QuoteSerializer, QuoteCreateSerializer
from .permissions import IsAdmin, IsOwnerOrAdmin
from .tasks import send_quote_email
from audit.tasks import log_action

User = get_user_model()

class QuoteListView(generics.ListAPIView):
    serializer_class = QuoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Quote.objects.all()
        return Quote.objects.filter(created_by=user)

class QuoteDetailView(generics.RetrieveAPIView):
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

class QuoteCreateView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuoteCreateSerializer(data=request.data)
        if serializer.is_valid():
            quote = Quote.objects.create(
                created_by=request.user,
                **serializer.validated_data
            )
            
            # Generate PDF and Send Email
            send_quote_email.delay(quote.id)
            
            log_action.delay(
                request.user.id,
                'QUOTE_CREATED',
                f'Quote created: {quote.reference_code} for {quote.client_name}',
                metadata={'quote_id': quote.id}
            )

            return Response(QuoteSerializer(quote).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class QuotePublicView(views.APIView):
    permission_classes = []

    def get(self, request, reference_code):
        try:
            quote = Quote.objects.get(reference_code=reference_code)
            quote.mark_viewed()
            return Response(QuoteSerializer(quote).data)
        except Quote.DoesNotExist:
            return Response({'detail': 'Quote not found'}, status=status.HTTP_404_NOT_FOUND)