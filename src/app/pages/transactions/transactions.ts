
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import AOS from 'aos';

interface Transaction {
  id: number;
  title: string;
  category: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  icon?: string;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss'
})
export class Transactions implements OnInit {
  private readonly storageKey = 'splittrack-personal-transactions';

  transactions: Transaction[] = [];

  searchText = '';
  selectedType = 'All';
  selectedCategory = 'All';
  selectedPeriod = 'All time';

  showForm = false;
  message = '';

  formData = {
    title: '',
    category: 'Food',
    type: 'expense' as 'income' | 'expense',
    amount: null as number | null,
    date: this.getToday()
  };

  readonly categories = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
    'Education',
    'Travel',
    'Salary',
    'Freelance',
    'Investment',
    'Other'
  ];

  readonly categoryIcons: Record<string, string> = {
    Food: '🍽️',
    Transport: '🚗',
    Shopping: '🛍️',
    Bills: '💡',
    Entertainment: '🎬',
    Health: '💚',
    Education: '📚',
    Travel: '✈️',
    Salary: '💼',
    Freelance: '💻',
    Investment: '📈',
    Other: '📦'
  };

  ngOnInit(): void {
    this.loadTransactions();

    if (typeof AOS !== 'undefined') {
      AOS.init({ duration: 650, once: true, offset: 30 });
    }
  }

  private getToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private loadTransactions(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      this.transactions = Array.isArray(parsed)
        ? parsed.filter((item: any) =>
            item &&
            Number.isFinite(Number(item.amount)) &&
            Number(item.amount) >= 0 &&
            (item.type === 'income' || item.type === 'expense')
          ).map((item: any) => ({
            ...item,
            id: Number(item.id) || Date.now(),
            title: String(item.title || 'Untitled transaction'),
            category: String(item.category || 'Other'),
            amount: Number(item.amount),
            date: String(item.date || this.getToday())
          }))
        : [];
    } catch (error) {
      console.error('Could not load transactions:', error);
      this.transactions = [];
      this.message = 'Unable to load saved transactions.';
    }
  }

  private saveTransactions(): boolean {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.transactions)
      );
      return true;
    } catch (error) {
      console.error('Could not save transactions:', error);
      this.message = 'Could not save changes. Check your browser storage.';
      return false;
    }
  }

  get filteredTransactions(): Transaction[] {
    const search = this.searchText.trim().toLowerCase();
    const now = new Date();

    return this.transactions
      .filter(transaction => {
        const matchesSearch =
          !search ||
          transaction.title.toLowerCase().includes(search) ||
          transaction.category.toLowerCase().includes(search);

        const matchesType =
          this.selectedType === 'All' ||
          transaction.type === this.selectedType.toLowerCase();

        const matchesCategory =
          this.selectedCategory === 'All' ||
          transaction.category === this.selectedCategory;

        const date = new Date(`${transaction.date}T12:00:00`);
        let matchesPeriod = true;

        if (this.selectedPeriod !== 'All time') {
          if (Number.isNaN(date.getTime())) {
            matchesPeriod = false;
          } else if (this.selectedPeriod === 'This month') {
            matchesPeriod =
              date.getFullYear() === now.getFullYear() &&
              date.getMonth() === now.getMonth();
          } else if (this.selectedPeriod === 'Last month') {
            const previousMonth = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1
            );

            matchesPeriod =
              date.getFullYear() === previousMonth.getFullYear() &&
              date.getMonth() === previousMonth.getMonth();
          } else if (this.selectedPeriod === 'This year') {
            matchesPeriod = date.getFullYear() === now.getFullYear();
          }
        }

        return matchesSearch && matchesType && matchesCategory && matchesPeriod;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  get totalIncome(): number {
    return this.filteredTransactions
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + this.toCents(item.amount), 0) / 100;
  }

  get totalExpenses(): number {
    return this.filteredTransactions
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + this.toCents(item.amount), 0) / 100;
  }

  get netBalance(): number {
    return (
      this.toCents(this.totalIncome) -
      this.toCents(this.totalExpenses)
    ) / 100;
  }

  get transactionCount(): number {
    return this.filteredTransactions.length;
  }

  get expenseCount(): number {
    return this.filteredTransactions.filter(
      item => item.type === 'expense'
    ).length;
  }

  get incomeCount(): number {
    return this.filteredTransactions.filter(
      item => item.type === 'income'
    ).length;
  }

  get availableCategories(): string[] {
    return [...new Set(this.transactions.map(item => item.category))]
      .sort((a, b) => a.localeCompare(b));
  }

  get categoryBreakdown(): {
    category: string;
    icon: string;
    total: number;
    percent: number;
  }[] {
    const expenses = this.filteredTransactions.filter(
      item => item.type === 'expense'
    );

    const totals = new Map<string, number>();

    expenses.forEach(item => {
      totals.set(
        item.category,
        (totals.get(item.category) || 0) + this.toCents(item.amount)
      );
    });

    const grandTotal = [...totals.values()].reduce(
      (sum, amount) => sum + amount,
      0
    );

    return [...totals.entries()]
      .map(([category, cents]) => ({
        category,
        icon: this.categoryIcons[category] || '📦',
        total: cents / 100,
        percent: grandTotal > 0 ? Math.round((cents / grandTotal) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  addTransaction(): void {
    const title = this.formData.title.trim();
    const amount = Number(this.formData.amount);
    const date = this.formData.date;
    const category = this.formData.category;
    const type = this.formData.type;

    if (!title) {
      this.message = 'Please enter a transaction title.';
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      this.message = 'Enter an amount greater than zero.';
      return;
    }

    if (!this.categories.includes(category)) {
      this.message = 'Please select a valid category.';
      return;
    }

    if (type !== 'income' && type !== 'expense') {
      this.message = 'Please select a valid transaction type.';
      return;
    }

    if (!date || Number.isNaN(new Date(`${date}T12:00:00`).getTime())) {
      this.message = 'Please select a valid date.';
      return;
    }

    const transaction: Transaction = {
      id: Date.now(),
      title,
      category,
      type,
      amount: this.toCents(amount) / 100,
      date,
      icon: this.categoryIcons[category] || '📦'
    };

    this.transactions = [transaction, ...this.transactions];

    if (!this.saveTransactions()) {
      this.transactions = this.transactions.filter(
        item => item.id !== transaction.id
      );
      return;
    }

    this.message = 'Transaction added successfully.';
    this.resetForm();
    this.showForm = false;
  }

  deleteTransaction(id: number): void {
    const previousTransactions = this.transactions;
    this.transactions = this.transactions.filter(
      item => item.id !== id
    );

    if (!this.saveTransactions()) {
      this.transactions = previousTransactions;
      return;
    }

    this.message = 'Transaction deleted successfully.';
  }

  resetForm(): void {
    this.formData = {
      title: '',
      category: 'Food',
      type: 'expense',
      amount: null,
      date: this.getToday()
    };
  }

  setType(type: string): void {
    this.selectedType = type;
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedType = 'All';
    this.selectedCategory = 'All';
    this.selectedPeriod = 'All time';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: string): string {
    const parsed = new Date(`${date}T12:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(parsed);
  }
}

