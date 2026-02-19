from django.urls import path
from .views import (
    TransactionListView, TransactionDetailView, TransactionInitiateView,
    TransactionStatusView, MpesaCallbackView, PaystackWebhookView,
    TransactionSummaryView, LedgerEntryListView
)

urlpatterns = [
    # ✅ SPECIFIC PATHS FIRST (in any order)
    path('list/', TransactionListView.as_view(), name='transaction-list'),
    path('initiate/', TransactionInitiateView.as_view(), name='transaction-initiate'),
    path('summary/', TransactionSummaryView.as_view(), name='transaction-summary'),
    path('ledger/', LedgerEntryListView.as_view(), name='ledger-list'),
    path('status/<str:reference_code>/', TransactionStatusView.as_view(), name='transaction-status'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('paystack/webhook/', PaystackWebhookView.as_view(), name='paystack-webhook'),
    
    # ❌ CATCH-ALL PATTERN LAST
    path('<str:reference_code>/', TransactionDetailView.as_view(), name='transaction-detail'),
]