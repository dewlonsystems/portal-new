from django.urls import path
from .views import VerifyDocumentView, VerificationLogListView

urlpatterns = [
    path('check/', VerifyDocumentView.as_view(), name='verify-document'),
    path('logs/', VerificationLogListView.as_view(), name='verification-logs'),
]