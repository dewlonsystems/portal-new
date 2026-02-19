from django.urls import path
from .views import QuoteListView, QuoteDetailView, QuoteCreateView, QuotePublicView

urlpatterns = [
    path('list/', QuoteListView.as_view(), name='quote-list'),
    path('<int:pk>/', QuoteDetailView.as_view(), name='quote-detail'),
    path('create/', QuoteCreateView.as_view(), name='quote-create'),
    path('public/<str:reference_code>/', QuotePublicView.as_view(), name='quote-public'),
]