from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import timedelta, datetime
from .serializers import (
    DashboardSummarySerializer, RevenueChartSerializer,
    TransactionTrendSerializer, UserActivitySerializer,
    FinancialSummarySerializer
)
from .permissions import IsAdmin, IsStaff
from payments.models import Transaction, LedgerEntry
from payouts.models import Payout
from contracts.models import Contract, Invoice
from users.models import User
from audit.models import AuditLog, UserSession
from django.db.models.functions import TruncDate, TruncWeek

User = get_user_model()

class DashboardSummaryView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())

        # Role-based filtering
        if user.role == 'ADMIN':
            transaction_filter = Q(status='COMPLETED')
            payout_filter = Q(status='COMPLETED')
            user_filter = Q()
        else:
            transaction_filter = Q(status='COMPLETED', user=user)
            payout_filter = Q()  # Staff can't see payouts
            user_filter = Q(id=user.id)

        # Calculate metrics
        total_revenue = Transaction.objects.filter(transaction_filter).aggregate(total=Sum('amount'))['total'] or 0
        total_transactions = Transaction.objects.filter(transaction_filter).count()
        total_payouts = Payout.objects.filter(payout_filter).aggregate(total=Sum('amount'))['total'] or 0
        active_users = UserSession.objects.filter(is_active=True).values('user').distinct().count()
        pending_contracts = Contract.objects.filter(status__in=['SENT', 'VIEWED']).count() if user.role == 'ADMIN' else Contract.objects.filter(created_by=user, status__in=['SENT', 'VIEWED']).count()
        overdue_invoices = Invoice.objects.filter(status='PENDING', due_date__lt=timezone.now()).count() if user.role == 'ADMIN' else Invoice.objects.filter(contract__created_by=user, status='PENDING', due_date__lt=timezone.now()).count()

        data = {
            'total_revenue': total_revenue,
            'total_transactions': total_transactions,
            'total_payouts': total_payouts,
            'active_users': active_users,
            'pending_contracts': pending_contracts,
            'overdue_invoices': overdue_invoices,
        }

        return Response(DashboardSummarySerializer(data).data)

class RevenueChartView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now().date() - timedelta(days=days)

        if user.role == 'ADMIN':
            transaction_filter = Q(status='COMPLETED', created_at__date__gte=start_date)
        else:
            transaction_filter = Q(status='COMPLETED', user=user, created_at__date__gte=start_date)

        revenue_data = Transaction.objects.filter(transaction_filter).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            amount=Sum('amount'),
            transaction_count=Count('id')
        ).order_by('date')

        serializer = RevenueChartSerializer(revenue_data, many=True)
        return Response(serializer.data)

class WeeklyTrendView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        weeks = int(request.query_params.get('weeks', 4))

        if user.role == 'ADMIN':
            transaction_filter = Q(status='COMPLETED')
        else:
            transaction_filter = Q(status='COMPLETED', user=user)

        weekly_data = Transaction.objects.filter(transaction_filter).annotate(
            week=TruncWeek('created_at')
        ).values('week').annotate(
            amount=Sum('amount')
        ).order_by('week')[:weeks]

        # Calculate percentage change
        data = []
        prev_amount = None
        for item in weekly_data:
            percentage_change = 0
            if prev_amount and prev_amount > 0:
                percentage_change = ((item['amount'] - prev_amount) / prev_amount) * 100
            data.append({
                'label': item['week'].strftime('%Y-%m-%d'),
                'value': item['amount'] or 0,
                'percentage_change': round(percentage_change, 2)
            })
            prev_amount = item['amount']

        serializer = TransactionTrendSerializer(data, many=True)
        return Response(serializer.data)

class UserActivityChartView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now().date() - timedelta(days=days)

        # Login activity
        login_data = AuditLog.objects.filter(
            action='LOGIN',
            timestamp__date__gte=start_date
        ).annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            logins=Count('id')
        ).order_by('date')

        # Transaction activity
        transaction_data = Transaction.objects.filter(
            created_at__date__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            transactions=Count('id')
        ).order_by('date')

        # Contract signing activity
        contract_data = AuditLog.objects.filter(
            action='CONTRACT_SIGNED',
            timestamp__date__gte=start_date
        ).annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            contracts_signed=Count('id')
        ).order_by('date')

        # Merge data by date
        all_dates = set()
        for item in login_data:
            all_dates.add(item['date'])
        for item in transaction_data:
            all_dates.add(item['date'])
        for item in contract_data:
            all_dates.add(item['date'])

        data = []
        for date in sorted(all_dates):
            logins = next((item['logins'] for item in login_data if item['date'] == date), 0)
            transactions = next((item['transactions'] for item in transaction_data if item['date'] == date), 0)
            contracts_signed = next((item['contracts_signed'] for item in contract_data if item['date'] == date), 0)
            data.append({
                'date': date,
                'logins': logins,
                'transactions': transactions,
                'contracts_signed': contracts_signed
            })

        serializer = UserActivitySerializer(data, many=True)
        return Response(serializer.data)

class FinancialSummaryView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        total_credits = LedgerEntry.objects.filter(entry_type='CREDIT').aggregate(total=Sum('amount'))['total'] or 0
        total_debits = LedgerEntry.objects.filter(entry_type='DEBIT').aggregate(total=Sum('amount'))['total'] or 0
        net_balance = total_credits - total_debits
        last_updated = LedgerEntry.objects.order_by('-created_at').values_list('created_at', flat=True).first()

        data = {
            'total_credits': total_credits,
            'total_debits': total_debits,
            'net_balance': net_balance,
            'last_updated': last_updated or timezone.now()
        }

        return Response(FinancialSummarySerializer(data).data)

class TransactionReportView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        status_filter = request.query_params.get('status')
        payment_method = request.query_params.get('payment_method')

        if user.role == 'ADMIN':
            queryset = Transaction.objects.all()
        else:
            queryset = Transaction.objects.filter(user=user)

        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        total_amount = queryset.aggregate(total=Sum('amount'))['total'] or 0
        count = queryset.count()
        by_status = queryset.values('status').annotate(count=Count('id'))
        by_method = queryset.values('payment_method').annotate(count=Count('id'), total=Sum('amount'))

        data = {
            'total_amount': total_amount,
            'total_count': count,
            'by_status': by_status,
            'by_method': by_method,
            'filters_applied': {
                'start_date': start_date,
                'end_date': end_date,
                'status': status_filter,
                'payment_method': payment_method
            }
        }

        return Response(data)

class UserPerformanceView(views.APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.filter(role='STAFF')
        data = []

        for user in users:
            transactions = Transaction.objects.filter(user=user, status='COMPLETED')
            contracts = Contract.objects.filter(created_by=user, status='SIGNED')
            quotes = Quote.objects.filter(created_by=user)

            data.append({
                'user_id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'total_revenue': transactions.aggregate(total=Sum('amount'))['total'] or 0,
                'transaction_count': transactions.count(),
                'contracts_signed': contracts.count(),
                'quotes_sent': quotes.count(),
                'last_login': user.last_login
            })

        return Response(data)

from quotes.models import Quote