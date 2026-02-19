from django.urls import path
from .views import (
    PayoutListView, PayoutDetailView, PayoutInitiateView,
    B2CResultCallbackView, B2CTimeoutCallbackView, PayoutSummaryView
)

urlpatterns = [
    path('list/', PayoutListView.as_view(), name='payout-list'),
    path('<int:pk>/', PayoutDetailView.as_view(), name='payout-detail'),
    path('initiate/', PayoutInitiateView.as_view(), name='payout-initiate'),
    path('summary/', PayoutSummaryView.as_view(), name='payout-summary'),
    # Public Callbacks (Secured by IP whitelist in production server config)
    path('mpesa/b2c/result/', B2CResultCallbackView.as_view(), name='b2c-result'),
    path('mpesa/b2c/timeout/', B2CTimeoutCallbackView.as_view(), name='b2c-timeout'),
]