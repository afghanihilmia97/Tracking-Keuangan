import type { AppData, Recurring, Transaction } from "@/lib/finance-types";

export type RecurringRunResult = {
  data: AppData;
  created: Transaction[];
  changed: boolean;
};

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function advanceRecurringDate(
  dateKey: string,
  frequency: Recurring["frequency"],
) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (frequency === "daily") date.setDate(date.getDate() + 1);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  if (frequency === "monthly") {
    const targetMonth = month;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    date.setFullYear(
      targetYear,
      normalizedMonth,
      Math.min(day, daysInMonth(targetYear, normalizedMonth)),
    );
  }
  if (frequency === "yearly") {
    const targetYear = year + 1;
    date.setFullYear(
      targetYear,
      month - 1,
      Math.min(day, daysInMonth(targetYear, month - 1)),
    );
  }
  return localDateKey(date);
}

function applyTransaction(data: AppData, transaction: Transaction): AppData {
  const balanceChange =
    transaction.type === "income" ? transaction.amount : -transaction.amount;
  return {
    ...data,
    transactions: [transaction, ...data.transactions],
    wallets: data.wallets.map((wallet) =>
      wallet.id === transaction.walletId
        ? { ...wallet, balance: wallet.balance + balanceChange }
        : wallet,
    ),
    budgets:
      transaction.type === "expense"
        ? data.budgets.map((budget) =>
            budget.category === transaction.category
              ? { ...budget, spent: budget.spent + transaction.amount }
              : budget,
          )
        : data.budgets,
  };
}

export function addRecurringTransactionNow(
  data: AppData,
  recurring: Recurring,
  date = localDateKey(),
) {
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    title: recurring.title,
    category: recurring.category,
    amount: recurring.amount,
    type: recurring.type,
    date,
    walletId: recurring.walletId,
    recurringId: recurring.id,
    note: "Dicatat manual dari transaksi berulang",
  };
  return { data: applyTransaction(data, transaction), transaction };
}

export function processDueRecurring(
  source: AppData,
  throughDate = localDateKey(),
): RecurringRunResult {
  let data = source;
  const created: Transaction[] = [];
  let changed = false;
  const updatedRecurring = source.recurring.map((original) => {
    let recurring = { ...original };
    let safety = 0;

    while (
      recurring.active &&
      recurring.nextDate <= throughDate &&
      (!recurring.endDate || recurring.nextDate <= recurring.endDate) &&
      safety < 4000
    ) {
      changed = true;
      const occurrenceDate = recurring.nextDate;
      const transactionId = `recurring:${recurring.id}:${occurrenceDate}`;
      const isSkipped = recurring.skipNextDate === occurrenceDate;
      const alreadyExists = data.transactions.some(
        (transaction) => transaction.id === transactionId,
      );

      if (!isSkipped && !alreadyExists) {
        const transaction: Transaction = {
          id: transactionId,
          title: recurring.title,
          category: recurring.category,
          amount: recurring.amount,
          type: recurring.type,
          date: occurrenceDate,
          walletId: recurring.walletId,
          recurringId: recurring.id,
          automatic: true,
          note: "Dibuat otomatis dari transaksi berulang",
        };
        data = applyTransaction(data, transaction);
        created.push(transaction);
      }

      recurring = {
        ...recurring,
        skipNextDate: isSkipped ? undefined : recurring.skipNextDate,
        nextDate: advanceRecurringDate(
          occurrenceDate,
          recurring.frequency || "monthly",
        ),
      };
      safety += 1;
    }

    if (recurring.endDate && recurring.nextDate > recurring.endDate) {
      if (recurring.active) changed = true;
      recurring.active = false;
    }
    return recurring;
  });

  return {
    data: { ...data, recurring: updatedRecurring },
    created,
    changed,
  };
}

export async function notifyRecurringCreated(transactions: Transaction[]) {
  if (!transactions.length) return;
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  const title =
    transactions.length === 1
      ? "Transaksi rutin otomatis dicatat"
      : `${transactions.length} transaksi rutin otomatis dicatat`;
  const body =
    transactions.length === 1
      ? `${transactions[0].title} · Rp ${transactions[0].amount.toLocaleString("id-ID")}`
      : `Total Rp ${total.toLocaleString("id-ID")} berhasil dimasukkan.`;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import(
        "@capacitor/local-notifications"
      );
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted")
        permission = await LocalNotifications.requestPermissions();
      if (permission.display === "granted") {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Date.now() % 2_000_000_000),
              title,
              body,
              schedule: { at: new Date(Date.now() + 500) },
              extra: { section: "rutin" },
            },
          ],
        });
      }
      return;
    }
    if ("Notification" in window && Notification.permission === "granted")
      new Notification(title, { body });
  } catch {
    // Toast di aplikasi tetap menjadi pemberitahuan cadangan.
  }
}
