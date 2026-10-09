
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import AOS from 'aos';

interface Transaction {
  id: number;
  title: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  icon: string;
}

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './personal.html',
  styleUrl: './personal.scss'
})
export class Personal implements OnInit, AfterViewInit, OnDestroy {
  private refreshTimer?: ReturnType<typeof setTimeout>;
  private messageTimer?: ReturnType<typeof setTimeout>;
  private readonly storageKey = 'splittrack-personal-transactions';

  readonly Math = Math;

  selectedPeriod = 'This month';
  selectedFilter = 'all';
  showTransactionForm = false;
  successMessage = '';

  transactions: Transaction[] = [];

  private readonly defaultTransactions: Transaction[] = [
    {
      id: 1,
      title: 'Monthly salary',
      category: 'Salary',
      type: 'income',
      amount: 45000,
      date: '2026-10-01',
      icon: '↗'
    },
    {
      id: 2,
      title: 'Grocery shopping',
      category: 'Food',
      type: 'expense',
      amount: 1850,
      date: '2026-10-03',
      icon: '🛒'
    },
    {
      id: 3,
      title: 'Freelance project',
      category: 'Freelance',
      type: 'income',
      amount: 8500,
      date: '2026-10-05',
      icon: '✦'
    },
    {
      id: 4,
      title: 'Electricity bill',
      category: 'Bills',
      type: 'expense',
      amount: 1250,
      date: '2026-10-07',
      icon: '⚡'
    }
  ];

  ngOnInit(): void {
    this.loadTransactions();
  }

  ngAfterViewInit(): void {
    AOS.refresh();
    this.refreshTimer = setTimeout(() => AOS.refresh(), 200);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (this.messageTimer) clearTimeout(this.messageTimer);
  }

  private toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private loadTransactions(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);

      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          this.transactions = parsed as Transaction[];
          return;
        }
      }
    } catch (error) {
      console.error('Could not load personal transactions:', error);
    }

    this.transactions = this.defaultTransactions.map(item => ({ ...item }));
    this.saveTransactions();
  }

  private saveTransactions(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.transactions));
    } catch (error) {
      console.error('Could not save personal transactions:', error);
      this.successMessage = 'Could not save data. Check your browser storage.';
    }
  }

  private get periodTransactions(): Transaction[] {
    if (this.selectedPeriod === 'All time') {
      return this.transactions;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (this.selectedPeriod === 'This month') {
      return this.transactions.filter(item => {
        const date = new Date(`${item.date}T12:00:00`);
        return date.getFullYear() === year && date.getMonth() === month;
      });
    }

    if (this.selectedPeriod === 'Last month') {
      const previousMonth = new Date(year, month - 1, 1);
      return this.transactions.filter(item => {
        const date = new Date(`${item.date}T12:00:00`);
        return date.getFullYear() === previousMonth.getFullYear()
          && date.getMonth() === previousMonth.getMonth();
      });
    }

    return this.transactions.filter(item => {
      const date = new Date(`${item.date}T12:00:00`);
      return date.getFullYear() === year;
    });
  }

  get totalIncome(): number {
    return this.periodTransactions
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + this.toCents(item.amount), 0) / 100;
  }

  get totalExpenses(): number {
    return this.periodTransactions
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + this.toCents(item.amount), 0) / 100;
  }

  get balance(): number {
    return this.toCents(this.totalIncome) / 100
      - this.toCents(this.totalExpenses) / 100;
  }

  get savingsRate(): number {
    return this.totalIncome > 0
      ? Math.round((this.balance / this.totalIncome) * 100)
      : 0;
  }

  get filteredTransactions(): Transaction[] {
    const items = this.selectedFilter === 'all'
      ? this.periodTransactions
      : this.periodTransactions.filter(
          item => item.type === this.selectedFilter
        );

    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }

  get categoryBreakdown(): { name: string; amount: number; percent: number }[] {
    const totals = new Map<string, number>();

    this.periodTransactions
      .filter(item => item.type === 'expense')
      .forEach(item => {
        const current = totals.get(item.category) ?? 0;
        totals.set(item.category, current + this.toCents(item.amount));
      });

    const totalCents = this.toCents(this.totalExpenses);

    return Array.from(totals.entries())
      .map(([name, cents]) => ({
        name,
        amount: cents / 100,
        percent: totalCents > 0
          ? Math.round((cents / totalCents) * 100)
          : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  get spendingBars(): { month: string; income: number; expense: number }[] {
    const now = new Date();
    const months: { month: string; income: number; expense: number }[] = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = date.getFullYear();
      const monthIndex = date.getMonth();

      const items = this.transactions.filter(item => {
        const transactionDate = new Date(`${item.date}T12:00:00`);
        return transactionDate.getFullYear() === year
          && transactionDate.getMonth() === monthIndex;
      });

      const incomeCents = items
        .filter(item => item.type === 'income')
        .reduce((sum, item) => sum + this.toCents(item.amount), 0);

      const expenseCents = items
        .filter(item => item.type === 'expense')
        .reduce((sum, item) => sum + this.toCents(item.amount), 0);

      months.push({
        month: date.toLocaleDateString('en-IN', { month: 'short' }),
        income: incomeCents / 100,
        expense: expenseCents / 100
      });
    }

    return months;
  }

  get maxChartValue(): number {
    return Math.max(
      1,
      ...this.spendingBars.flatMap(item => [item.income, item.expense])
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  }

  addTransaction(form: NgForm): void {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    const value = form.value;
    const amount = Number(value.amount);
    const title = String(value.title ?? '').trim();
    const date = String(value.date ?? '');
    const type = value.type;

    if (!title) {
      this.successMessage = 'Please enter a transaction title.';
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.successMessage = 'Enter an amount greater than zero.';
      return;
    }

    if (!['income', 'expense'].includes(type)) {
      this.successMessage = 'Please select a valid transaction type.';
      return;
    }

    if (!date || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) {
      this.successMessage = 'Please select a valid transaction date.';
      return;
    }

    const transaction: Transaction = {
      id: Date.now(),
      title,
      category: String(value.category || 'Other'),
      type,
      amount: this.toCents(amount) / 100,
      date,
      icon: type === 'income' ? '↗' : '•'
    };

    this.transactions = [...this.transactions, transaction];
    this.saveTransactions();
    this.showTransactionForm = false;
    form.resetForm({
      type: 'expense',
      date: new Date().toISOString().slice(0, 10)
    });

    this.showMessage('Transaction added successfully.');
  }

  deleteTransaction(id: number): void {
    this.transactions = this.transactions.filter(item => item.id !== id);
    this.saveTransactions();
    this.showMessage('Transaction removed.');
  }

  private showMessage(message: string): void {
    this.successMessage = message;

    if (this.messageTimer) clearTimeout(this.messageTimer);

    this.messageTimer = setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }
}