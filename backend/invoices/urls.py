from django.urls import path
from .views import (
    InvoiceListView, InvoiceDetailView, InvoiceCreateView,
    InvoiceUpdateStatusView, InvoiceSendView, InvoiceDownloadView,
    OverdueInvoicesView
)

urlpatterns = [
    path('list/', InvoiceListView.as_view(), name='invoice-list'),
    path('<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('create/', InvoiceCreateView.as_view(), name='invoice-create'),
    path('<int:pk>/status/', InvoiceUpdateStatusView.as_view(), name='invoice-update-status'),
    path('<int:pk>/send/', InvoiceSendView.as_view(), name='invoice-send'),
    path('<int:pk>/download/', InvoiceDownloadView.as_view(), name='invoice-download'),
    path('overdue/', OverdueInvoicesView.as_view(), name='overdue-invoices'),
]