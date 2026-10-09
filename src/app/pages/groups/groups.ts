import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import AOS from 'aos';


type SplitMode = 'equal' | 'custom';

interface MoneyGroup {
id: number;
name: string;
category: string;
members: string[];
budget: number;
}

interface GroupExpense {
id: number;
groupId: number;
description: string;
amount: number;
paidBy: string;
splitAmong: string[];
splitMode?: SplitMode;
splitAmounts?: Record<string, number>;
date: string;
}

@Component({
selector: 'app-groups',
standalone: true,
imports: [CommonModule, FormsModule, RouterLink],
templateUrl: './groups.html',
styleUrl: './groups.scss'
})
export class Groups implements OnInit, AfterViewInit {
private readonly groupStorageKey = 'splittrack-groups';
private readonly expenseStorageKey = 'splittrack-group-expenses';
get expenseAmountValue(): number {
  return Number(this.expenseAmount) || 0;
}
private readonly defaultGroups: MoneyGroup[] = [
{
id: 1,
name: 'Goa Getaway',
category: 'Trip',
members: ['You', 'Alex', 'Priya'],
budget: 25000
},
{
id: 2,
name: 'Flatmates',
category: 'Home',
members: ['You', 'Sam', 'Riya'],
budget: 15000
},
{
id: 3,
name: 'Weekend Crew',
category: 'Friends',
members: ['You', 'Jay', 'Mia'],
budget: 8000
}
];

groups: MoneyGroup[] = [];
expenses: GroupExpense[] = [];

showAddGroup = false;
showAddExpense = false;
formError = '';
expenseError = '';

groupName = '';
groupCategory = 'Trip';
memberNames = '';
groupBudget: number | null = null;

selectedGroupId: number | null = null;
expenseDescription = '';
expenseAmount: number | null = null;
expensePaidBy = '';
expenseSplitAmong: string[] = [];
expenseDate = new Date().toISOString().slice(0, 10);

splitMode: SplitMode = 'equal';
expenseCustomShares: Record<string, number> = {};

ngOnInit(): void {
this.loadGroups();
this.loadExpenses();
}

ngAfterViewInit(): void {
AOS.init({
duration: 800,
easing: 'ease-out-cubic',
once: true,
offset: 60
});
AOS.refresh();
}

get totalBudget(): number {
return this.groups.reduce((sum, group) => sum + group.budget, 0);
}

get totalMembers(): number {
return this.groups.reduce((sum, group) => sum + group.members.length, 0);
}

get selectedGroup(): MoneyGroup | undefined {
return this.groups.find(group => group.id === this.selectedGroupId);
}

get selectedGroupExpenses(): GroupExpense[] {
return this.expenses
.filter(expense => expense.groupId === this.selectedGroupId)
.sort((a, b) => b.date.localeCompare(a.date));
}

get selectedGroupExpenseTotal(): number {
return this.selectedGroupExpenses.reduce(
(sum, expense) => sum + expense.amount,
0
);
}

get customSplitTotal(): number {
return this.expenseSplitAmong.reduce(
(sum, member) => sum + this.toCents(this.expenseCustomShares[member] ?? 0),
0
) / 100;
}

get splitPreviewTotal(): number {
if (this.splitMode === 'custom') {
return this.customSplitTotal;
}


return this.expenseSplitAmong.length
  ? Number((Number(this.expenseAmount || 0) / this.expenseSplitAmong.length).toFixed(2))
  : 0;


}

get customSplitDifference(): number {
return Number((Number(this.expenseAmount || 0) - this.customSplitTotal).toFixed(2));
}


get selectedGroupBalances(): {
  name: string;
  paid: number;
  share: number;
  balance: number;
}[] {
  const group = this.selectedGroup;
  if (!group) return [];

  const toCents = (amount: number): number =>
    Math.round((amount + Number.EPSILON) * 100);

  return group.members.map(name => {
    let paidCents = 0;
    let shareCents = 0;

    for (const expense of this.selectedGroupExpenses) {
      if (expense.paidBy === name) {
        paidCents += toCents(expense.amount);
      }

      if (!expense.splitAmong?.includes(name)) {
        continue;
      }

      if (
        expense.splitAmounts &&
        typeof expense.splitAmounts[name] === 'number'
      ) {
        shareCents += toCents(expense.splitAmounts[name]);
      } else if (expense.splitAmong.length > 0) {
        // Preserve compatibility with older saved expenses.
        const amountCents = toCents(expense.amount);
        const baseShare = Math.floor(
          amountCents / expense.splitAmong.length
        );
        const remainder = amountCents % expense.splitAmong.length;
        const memberIndex = expense.splitAmong.indexOf(name);

        shareCents += baseShare +
          (memberIndex < remainder ? 1 : 0);
      }
    }

    return {
      name,
      paid: paidCents / 100,
      share: shareCents / 100,
      balance: (paidCents - shareCents) / 100
    };
  });
}

private toCents(value: number): number {
return Math.round((Number(value) + Number.EPSILON) * 100);
}

private loadGroups(): void {
try {
const saved = localStorage.getItem(this.groupStorageKey);

 
  if (saved !== null) {
    const parsed: unknown = JSON.parse(saved);

    if (Array.isArray(parsed)) {
      this.groups = parsed as MoneyGroup[];
      return;
    }
  }
} catch (error) {
  console.error('Could not load groups:', error);
}

this.groups = this.defaultGroups.map(group => ({
  ...group,
  members: [...group.members]
}));

this.saveGroups();
 

}

private saveGroups(): void {
try {
localStorage.setItem(this.groupStorageKey, JSON.stringify(this.groups));
} catch (error) {
console.error('Could not save groups:', error);
}
}

private loadExpenses(): void {
try {
const saved = localStorage.getItem(this.expenseStorageKey);

 
  if (saved !== null) {
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      this.expenses = parsed as GroupExpense[];
    }
  }
} catch (error) {
  console.error('Could not load expenses:', error);
  this.expenses = [];
}
 

}

private saveExpenses(): void {
try {
localStorage.setItem(this.expenseStorageKey, JSON.stringify(this.expenses));
} catch (error) {
console.error('Could not save expenses:', error);
}
}

openAddGroup(): void {
this.formError = '';
this.showAddGroup = true;
}

closeAddGroup(): void {
this.showAddGroup = false;
this.formError = '';
}

createGroup(): void {
const name = this.groupName.trim();
const members = this.memberNames
.split(',')
.map(member => member.trim())
.filter(Boolean);
const budget = Number(this.groupBudget);

 
if (!name) {
  this.formError = 'Please enter a group name.';
  return;
}

if (members.length === 0) {
  this.formError = 'Please add at least one member.';
  return;
}

if (this.groupBudget === null || !Number.isFinite(budget) || budget < 0) {
  this.formError = 'Please enter a valid, non-negative budget.';
  return;
}

const uniqueMembers = [...new Set(
  members.filter(member => member.toLowerCase() !== 'you')
)];

this.groups.unshift({
  id: Date.now(),
  name,
  category: this.groupCategory,
  members: ['You', ...uniqueMembers],
  budget
});

this.saveGroups();
this.groupName = '';
this.groupCategory = 'Trip';
this.memberNames = '';
this.groupBudget = null;
this.formError = '';
this.showAddGroup = false;
 

}

deleteGroup(id: number): void {
this.groups = this.groups.filter(group => group.id !== id);
this.expenses = this.expenses.filter(expense => expense.groupId !== id);

 
this.saveGroups();
this.saveExpenses();

if (this.selectedGroupId === id) {
  this.selectedGroupId = null;
  this.showAddExpense = false;
}
 

}

openAddExpense(groupId: number): void {
const group = this.groups.find(item => item.id === groupId);
if (!group) return;

 
this.selectedGroupId = groupId;
this.expenseDescription = '';
this.expenseAmount = null;
this.expensePaidBy = group.members[0] ?? '';
this.expenseSplitAmong = [...group.members];
this.expenseCustomShares = Object.fromEntries(
  group.members.map(member => [member, 0])
);
this.splitMode = 'equal';
this.expenseDate = new Date().toISOString().slice(0, 10);
this.expenseError = '';
this.showAddExpense = true;
 

}

closeAddExpense(): void {
this.showAddExpense = false;
this.expenseError = '';
}

changeSplitMode(mode: SplitMode): void {
this.splitMode = mode;
this.expenseError = '';
}

updateCustomShare(member: string, value: number | string): void {
const amount = Number(value);

 
this.expenseCustomShares = {
  ...this.expenseCustomShares,
  [member]: value === '' ? 0 : amount
};
 

}

toggleSplitMember(member: string, checked: boolean): void {
if (checked) {
if (!this.expenseSplitAmong.includes(member)) {
this.expenseSplitAmong = [...this.expenseSplitAmong, member];
}
} else {
this.expenseSplitAmong = this.expenseSplitAmong.filter(
name => name !== member
);
}
}

createExpense(): void {
const group = this.selectedGroup;
const description = this.expenseDescription.trim();
const amount = Number(this.expenseAmount);


if (!group) {
  this.expenseError = 'Please select a group.';
  return;
}

if (!description) {
  this.expenseError = 'Please enter an expense description.';
  return;
}

if (this.expenseAmount === null || !Number.isFinite(amount) || amount <= 0) {
  this.expenseError = 'Enter an amount greater than zero.';
  return;
}

if (!group.members.includes(this.expensePaidBy)) {
  this.expenseError = 'Please select who paid.';
  return;
}

if (this.expenseSplitAmong.length === 0) {
  this.expenseError = 'Select at least one member to split the expense.';
  return;
}

const amountCents = this.toCents(amount);
const splitAmounts: Record<string, number> = {};

if (this.splitMode === 'equal') {
  const baseShare = Math.floor(amountCents / this.expenseSplitAmong.length);
  let remainder = amountCents - baseShare * this.expenseSplitAmong.length;

  this.expenseSplitAmong.forEach(member => {
    const extraCent = remainder > 0 ? 1 : 0;
    splitAmounts[member] = (baseShare + extraCent) / 100;
    remainder -= extraCent;
  });
} else {
  let customTotalCents = 0;

  for (const member of this.expenseSplitAmong) {
    const share = this.expenseCustomShares[member];

    if (!Number.isFinite(share) || share < 0) {
      this.expenseError = `Enter a valid share for ${member}.`;
      return;
    }

    const cents = this.toCents(share);
    splitAmounts[member] = cents / 100;
    customTotalCents += cents;
  }

  if (customTotalCents !== amountCents) {
    this.expenseError =
      `Custom shares must total ${this.formatCurrency(amount)}. ` +
      `Your current total is ${this.formatCurrency(customTotalCents / 100)}.`;
    return;
  }
}

this.expenses.push({
  id: Date.now(),
  groupId: group.id,
  description,
  amount: amountCents / 100,
  paidBy: this.expensePaidBy,
  splitAmong: [...this.expenseSplitAmong],
  splitMode: this.splitMode,
  splitAmounts,
  date: this.expenseDate || new Date().toISOString().slice(0, 10)
});

this.saveExpenses();
this.closeAddExpense();


}

deleteExpense(id: number): void {
this.expenses = this.expenses.filter(expense => expense.id !== id);
this.saveExpenses();
}

formatCurrency(amount: number): string {
return new Intl.NumberFormat('en-IN', {
style: 'currency',
currency: 'INR',
maximumFractionDigits: 2
}).format(amount);
}

trackGroup(index: number, group: MoneyGroup): number {
return group.id;
}

trackExpense(index: number, expense: GroupExpense): number {
return expense.id;
}
}
