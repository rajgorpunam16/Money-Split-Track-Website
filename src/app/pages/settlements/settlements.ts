import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';import { Component, OnInit } from '@angular/core';

interface MoneyGroup {
  id: number;
  name: string;
  members: string[];
}

interface GroupExpense {
  id: number;
  groupId: number;
  description: string;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  splitAmounts?: Record<string, number>;
}

interface Settlement {
  id: number;
  groupId: number;
  groupName: string;
  from: string;
  to: string;
  amount: number;
  settled: boolean;
  createdAt: string;
}

interface PaymentSuggestion {
  groupId: number;
  groupName: string;
  from: string;
  to: string;
  amount: number;
  key: string;
}

@Component({
  selector: 'app-settlements',
  standalone: true,
 imports: [CommonModule, RouterLink],
  templateUrl: './settlements.html',
  styleUrl: './settlements.scss'
})
export class Settlements implements OnInit {
  groups: MoneyGroup[] = [];
  expenses: GroupExpense[] = [];
  settlements: Settlement[] = [];
  suggestions: PaymentSuggestion[] = [];

  filter: 'all' | 'pending' | 'completed' = 'all';
  message = '';

  private readonly groupStorageKey = 'splittrack-groups';
  private readonly expenseStorageKey = 'splittrack-group-expenses';
  private readonly settlementStorageKey = 'splittrack-settlements';

  ngOnInit(): void {
    this.loadData();
    this.calculateSuggestions();
  }

  get pendingSettlements(): Settlement[] {
    return this.settlements.filter(item => !item.settled);
  }

  get completedSettlements(): Settlement[] {
    return this.settlements.filter(item => item.settled);
  }

  get filteredSettlements(): Settlement[] {
    if (this.filter === 'pending') return this.pendingSettlements;
    if (this.filter === 'completed') return this.completedSettlements;
    return this.settlements;
  }

  get totalYouOwe(): number {
    return this.pendingSettlements
      .filter(item => item.from === 'You')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get totalOwedToYou(): number {
    return this.pendingSettlements
      .filter(item => item.to === 'You')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get totalSettled(): number {
    return this.completedSettlements.reduce((sum, item) => sum + item.amount, 0);
  }

  private loadData(): void {
    try {
      this.groups = JSON.parse(localStorage.getItem(this.groupStorageKey) || '[]');
      this.expenses = JSON.parse(localStorage.getItem(this.expenseStorageKey) || '[]');
      this.settlements = JSON.parse(localStorage.getItem(this.settlementStorageKey) || '[]');
    } catch (error) {
      console.error('Could not load settlement data:', error);
      this.groups = [];
      this.expenses = [];
      this.settlements = [];
    }
  }

  private saveSettlements(): void {
    localStorage.setItem(
      this.settlementStorageKey,
      JSON.stringify(this.settlements)
    );
  }

 
private calculateSuggestions(): void {
  const suggestions: PaymentSuggestion[] = [];
  const toCents = (amount: number): number =>
    Math.round((amount + Number.EPSILON) * 100);

  for (const group of this.groups) {
    const groupExpenses = this.expenses.filter(
      expense => expense.groupId === group.id
    );

    const balances = group.members.map(name => {
      let paidCents = 0;
      let shareCents = 0;

      for (const expense of groupExpenses) {
        if (expense.paidBy === name) {
          paidCents += toCents(expense.amount);
        }

        if (!expense.splitAmong?.includes(name)) continue;

        if (
          expense.splitAmounts &&
          typeof expense.splitAmounts[name] === 'number'
        ) {
          shareCents += toCents(expense.splitAmounts[name]);
        } else if (expense.splitAmong.length > 0) {
          const amountCents = toCents(expense.amount);
          const count = expense.splitAmong.length;
          const baseShare = Math.floor(amountCents / count);
          const remainder = amountCents % count;
          const memberIndex = expense.splitAmong.indexOf(name);

          shareCents += baseShare +
            (memberIndex < remainder ? 1 : 0);
        }
      }

      let settledCents = 0;

      for (const item of this.settlements) {
        if (item.groupId !== group.id || !item.settled) continue;

        if (item.from === name) settledCents += toCents(item.amount);
        if (item.to === name) settledCents -= toCents(item.amount);
      }

      return {
        name,
        balanceCents: paidCents - shareCents + settledCents
      };
    });

    const debtors = balances
      .filter(person => person.balanceCents < 0)
      .map(person => ({
        name: person.name,
        amountCents: -person.balanceCents
      }));

    const creditors = balances
      .filter(person => person.balanceCents > 0)
      .map(person => ({
        name: person.name,
        amountCents: person.balanceCents
      }));

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (
      debtorIndex < debtors.length &&
      creditorIndex < creditors.length
    ) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];

      const amountCents = Math.min(
        debtor.amountCents,
        creditor.amountCents
      );

      if (amountCents <= 0) break;

      const alreadyPendingCents = this.pendingSettlements
        .filter(item =>
          item.groupId === group.id &&
          item.from === debtor.name &&
          item.to === creditor.name
        )
        .reduce((sum, item) => sum + toCents(item.amount), 0);

      const suggestedCents = Math.max(
        0,
        amountCents - alreadyPendingCents
      );

      if (suggestedCents > 0) {
        suggestions.push({
          groupId: group.id,
          groupName: group.name,
          from: debtor.name,
          to: creditor.name,
          amount: suggestedCents / 100,
          key: `${group.id}-${debtor.name}-${creditor.name}`
        });
      }

      debtor.amountCents -= amountCents;
      creditor.amountCents -= amountCents;

      if (debtor.amountCents === 0) debtorIndex++;
      if (creditor.amountCents === 0) creditorIndex++;
    }
  }

  this.suggestions = suggestions;
}

  recordSettlement(suggestion: PaymentSuggestion): void {
    const alreadyExists = this.pendingSettlements.some(
      item => item.groupId === suggestion.groupId &&
        item.from === suggestion.from &&
        item.to === suggestion.to
    );

    if (alreadyExists) {
      this.message = 'A pending payment already exists for this pair.';
      return;
    }

    this.settlements.unshift({
      id: Date.now(),
      groupId: suggestion.groupId,
      groupName: suggestion.groupName,
      from: suggestion.from,
      to: suggestion.to,
      amount: suggestion.amount,
      settled: false,
      createdAt: new Date().toISOString()
    });

    this.saveSettlements();
    this.calculateSuggestions();
    this.message = 'Payment added to your settlement list.';
  }

  markAsSettled(settlement: Settlement): void {
    settlement.settled = true;
    this.saveSettlements();
    this.calculateSuggestions();
    this.message = 'Settlement marked as completed.';
  }

  deleteSettlement(settlementId: number): void {
    this.settlements = this.settlements.filter(
      item => item.id !== settlementId
    );
    this.saveSettlements();
    this.calculateSuggestions();
    this.message = 'Settlement removed.';
  }

  setFilter(filter: 'all' | 'pending' | 'completed'): void {
    this.filter = filter;
    this.message = '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }
}