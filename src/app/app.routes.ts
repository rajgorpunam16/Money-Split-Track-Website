import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Personal } from './pages/personal/personal';
import { Groups } from './pages/groups/groups';
import { Budgets } from './pages/budgets/budgets';
import { Transactions } from './pages/transactions/transactions';
import { Settlements } from './pages/settlements/settlements';

export const routes: Routes = [
{ path: '', component: Home, title: 'Home | SplitTrack' },
{ path: 'about', component: About, title: 'About Us | SplitTrack' },
{ path: 'contact', component: Contact, title: 'Contact Us | SplitTrack' },
{ path: 'personal', component: Personal, title: 'Personal Tracker | SplitTrack' },
{ path: 'groups', component: Groups, title: 'Group Tracker | SplitTrack' },
{ path: 'budgets', component: Budgets, title: 'Budgets | SplitTrack' },
{ path: 'transactions', component: Transactions, title: 'Transactions | SplitTrack' },
{ path: 'settlements', component: Settlements, title: 'Settlements | SplitTrack' },
{ path: '**', redirectTo: '' }
];
