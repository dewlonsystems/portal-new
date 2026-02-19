from django.urls import path
from .views import (
    DashboardSummaryView, RevenueChartView, WeeklyTrendView,
    UserActivityChartView, FinancialSummaryView, TransactionReportView,
    UserPerformanceView
)

urlpatterns = [
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/revenue-chart/', RevenueChartView.as_view(), name='revenue-chart'),
    path('dashboard/weekly-trend/', WeeklyTrendView.as_view(), name='weekly-trend'),
    path('dashboard/user-activity/', UserActivityChartView.as_view(), name='user-activity'),
    path('financial/summary/', FinancialSummaryView.as_view(), name='financial-summary'),
    path('reports/transactions/', TransactionReportView.as_view(), name='transaction-report'),
    path('reports/user-performance/', UserPerformanceView.as_view(), name='user-performance'),
]