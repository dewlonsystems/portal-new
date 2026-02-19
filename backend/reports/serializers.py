from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

class DashboardSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_transactions = serializers.IntegerField()
    total_payouts = serializers.DecimalField(max_digits=15, decimal_places=2)
    active_users = serializers.IntegerField()
    pending_contracts = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()

class RevenueChartSerializer(serializers.Serializer):
    date = serializers.DateField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    transaction_count = serializers.IntegerField()

class TransactionTrendSerializer(serializers.Serializer):
    label = serializers.CharField()
    value = serializers.DecimalField(max_digits=15, decimal_places=2)
    percentage_change = serializers.FloatField()

class UserActivitySerializer(serializers.Serializer):
    date = serializers.DateField()
    logins = serializers.IntegerField()
    transactions = serializers.IntegerField()
    contracts_signed = serializers.IntegerField()

class FinancialSummarySerializer(serializers.Serializer):
    total_credits = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_debits = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    last_updated = serializers.DateTimeField()