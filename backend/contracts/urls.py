from django.urls import path
from .views import (
    ContractListView, ContractDetailView, ContractCreateView,
    ContractPublicView, ContractSignView, InvoiceListView, InvoiceDetailView
)

urlpatterns = [
    path('list/', ContractListView.as_view(), name='contract-list'),
    path('<int:pk>/', ContractDetailView.as_view(), name='contract-detail'),
    path('create/', ContractCreateView.as_view(), name='contract-create'),
    path('invoices/', InvoiceListView.as_view(), name='invoice-list'),
    path('invoices/<int:pk>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    # Public Signing Links
    path('sign/<str:token>/', ContractPublicView.as_view(), name='contract-public-view'),
    path('sign/<str:token>/submit/', ContractSignView.as_view(), name='contract-sign'),
]