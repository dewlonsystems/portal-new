from django.urls import path
from .views import (
    ReceiptListView, ReceiptDetailView, ReceiptGenerateView,
    ReceiptDownloadView, ReceiptEmailView, TransactionReceiptView
)

urlpatterns = [
    path('list/', ReceiptListView.as_view(), name='receipt-list'),
    path('<int:pk>/', ReceiptDetailView.as_view(), name='receipt-detail'),
    path('generate/', ReceiptGenerateView.as_view(), name='receipt-generate'),
    path('<int:receipt_id>/download/', ReceiptDownloadView.as_view(), name='receipt-download'),
    path('<int:receipt_id>/email/', ReceiptEmailView.as_view(), name='receipt-email'),
    path('transaction/<int:transaction_id>/', TransactionReceiptView.as_view(), name='transaction-receipt'),
]