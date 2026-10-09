export type TxType = "income" | "expense";
export type Transaction = {
  id: string; title: string; category: string; amount: number; type: TxType;
  date: string; walletId?: string; note?: string; receipt?: string; splitGroupId?: string;
  recurringId?: string; automatic?: boolean;
};
export type Budget = { id: string; category: string; limit: number; spent: number; color: string };
export type Goal = { id: string; title: string; target: number; saved: number; deadline: string };
export type Wallet = {
  id: string; name: string; type: "cash" | "bank" | "ewallet" | "credit";
  balance: number; color: string;
};
export type Recurring = {
  id: string; title: string; category: string; amount: number; type: TxType;
  walletId: string; frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string; endDate?: string; skipNextDate?: string; active: boolean;
};
export type Bill = {
  id: string; title: string; category: string; amount: number; dueDate: string;
  paid: boolean; walletId: string;
};
export type Debt = {
  id: string; name: string; note: string; amount: number;
  type: "owe" | "receivable"; dueDate: string; paid: boolean;
};
export type AppData = {
  transactions: Transaction[]; budgets: Budget[]; goals: Goal[]; wallets: Wallet[];
  recurring: Recurring[]; bills: Bill[]; debts: Debt[];
};

export const emptyAdvancedData = {
  wallets: [] as Wallet[], recurring: [] as Recurring[], bills: [] as Bill[], debts: [] as Debt[],
};

export function migrateData(value: Partial<AppData>, defaults: AppData): AppData {
  return {
    transactions: Array.isArray(value.transactions) ? value.transactions : defaults.transactions,
    budgets: Array.isArray(value.budgets) ? value.budgets : defaults.budgets,
    goals: Array.isArray(value.goals) ? value.goals : defaults.goals,
    wallets: Array.isArray(value.wallets) && value.wallets.length ? value.wallets : defaults.wallets,
    recurring: Array.isArray(value.recurring) ? value.recurring : defaults.recurring,
    bills: Array.isArray(value.bills) ? value.bills : defaults.bills,
    debts: Array.isArray(value.debts) ? value.debts : defaults.debts,
  };
}
