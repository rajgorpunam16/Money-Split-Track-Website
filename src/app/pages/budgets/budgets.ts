
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import AOS from 'aos';

interface Budget {
  id: number;
  category: string;
  limit: number;
  icon: string;
}

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
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './budgets.html',
  styleUrl: './budgets.scss'
})
export class Budgets implements OnInit {
  private readonly budgetStorageKey = 'splittrack-budgets';
  private readonly transactionStorageKey = 'splittrack-personal-transactions';

  selectedPeriod = 'This month';
  showBudgetForm = false;
  message = '';

  budgets: Budget[] = [];
  transactions: Transaction[] = [];

  readonly categories = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
    'Education',
    'Travel',
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
    Other: '📦'
  };

  private readonly defaultBudgets: Budget[] = [
    { id: 1, category: 'Food', limit: 6000, icon: '🍽️' },
    { id: 2, category: 'Transport', limit: 2500, icon: '🚗' },
    { id: 3, category: 'Shopping', limit: 4000, icon: '🛍️' },
    { id: 4, category: 'Bills', limit: 3500, icon: '💡' },
    { id: 5, category: 'Entertainment', limit: 2000, icon: '🎬' }
  ];

  ngOnInit(): void {
    this.loadBudgets();
    this.loadTransactions();
  }

  private toCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100);
  }

  private loadBudgets(): void {
    try {
      const saved = localStorage.getItem(this.budgetStorageKey);

      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          this.budgets = parsed as Budget[];
          return;
        }
      }
    } catch (error) {
      console.error('Could not load budgets:', error);
    }

    this.budgets = this.defaultBudgets.map(item => ({ ...item }));
    this.saveBudgets();
  }

  private saveBudgets(): void {
    try {
      localStorage.setItem(
        this.budgetStorageKey,
        JSON.stringify(this.budgets)
      );
    } catch (error) {
      console.error('Could not save budgets:', error);
      this.message = 'Could not save your budget. Check browser storage.';
    }
  }

  private loadTransactions(): void {
    try {
      const saved = localStorage.getItem(this.transactionStorageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      this.transactions = Array.isArray(parsed)
        ? parsed as Transaction[]
        : [];
    } catch (error) {
      console.error('Could not load transactions:', error);
      this.transactions = [];
    }
  }

  private get periodTransactions(): Transaction[] {
    const now = new Date();

    return this.transactions.filter(item => {
      if (item.type !== 'expense') return false;

      const date = new Date(`${item.date}T12:00:00`);

      if (Number.isNaN(date.getTime())) return false;

      if (this.selectedPeriod === 'All time') return true;

      if (this.selectedPeriod === 'This month') {
        return date.getFullYear() === now.getFullYear()
          && date.getMonth() === now.getMonth();
      }

      if (this.selectedPeriod === 'Last month') {
        const previousMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );

        return date.getFullYear() === previousMonth.getFullYear()
          && date.getMonth() === previousMonth.getMonth();
      }

      return date.getFullYear() === now.getFullYear();
    });
  }

  get totalBudget(): number {
    return this.budgets.reduce(
      (sum, budget) => sum + this.toCents(budget.limit),
      0
    ) / 100;
  }

  get totalSpent(): number {
    return this.periodTransactions.reduce(
      (sum, item) => sum + this.toCents(item.amount),
      0
    ) / 100;
  }

  get remainingBudget(): number {
    return (this.toCents(this.totalBudget) - this.toCents(this.totalSpent)) / 100;
  }

  get overallUsage(): number {
    return this.totalBudget > 0
      ? Math.round((this.totalSpent / this.totalBudget) * 100)
      : 0;
  }

  get budgetCards(): (Budget & {
    spent: number;
    remaining: number;
    percent: number;
    overBudget: boolean;
  })[] {
    return this.budgets.map(budget => {
      const spentCents = this.periodTransactions
        .filter(item => item.category === budget.category)
        .reduce((sum, item) => sum + this.toCents(item.amount), 0);

      const limitCents = this.toCents(budget.limit);
      const percent = limitCents > 0
        ? Math.round((spentCents / limitCents) * 100)
        : spentCents > 0 ? 100 : 0;

      return {
        ...budget,
        spent: spentCents / 100,
        remaining: (limitCents - spentCents) / 100,
        percent: Math.min(percent, 100),
        overBudget: spentCents > limitCents
      };
    });
  }

  get uncategorizedSpending(): number {
    const budgetedCategories = new Set(
      this.budgets.map(item => item.category)
    );

    return this.periodTransactions
      .filter(item => !budgetedCategories.has(item.category))
      .reduce((sum, item) => sum + this.toCents(item.amount), 0) / 100;
  }

  get overBudgetCount(): number {
    return this.budgetCards.filter(item => item.overBudget).length;
  }

  addBudget(form: NgForm): void {
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    const value = form.value;
    const category = String(value.category || '');
    const limit = Number(value.limit);

    if (!this.categories.includes(category)) {
      this.message = 'Please select a valid category.';
      return;
    }

    if (!Number.isFinite(limit) || limit <= 0) {
      this.message = 'Enter a budget greater than zero.';
      return;
    }

    if (this.budgets.some(item => item.category === category)) {
      this.message = `A budget for ${category} already exists.`;
      return;
    }

    this.budgets = [
      ...this.budgets,
      {
        id: Date.now(),
        category,
        limit: this.toCents(limit) / 100,
        icon: this.categoryIcons[category] || '📦'
      }
    ];

    this.saveBudgets();
    this.showBudgetForm = false;
    form.resetForm();
    this.message = 'Budget created successfully.';
  }

  deleteBudget(id: number): void {
    this.budgets = this.budgets.filter(item => item.id !== id);
    this.saveBudgets();
    this.message = 'Budget removed.';
  }

  setPeriod(period: string): void {
    this.selectedPeriod = period;
    this.message = '';
    this.loadTransactions();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }
}