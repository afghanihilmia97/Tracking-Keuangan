"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  BellRing,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  CloudOff,
  CloudUpload,
  CheckCircle2,
  Download,
  FileJson,
  Flag,
  HandCoins,
  Home,
  Landmark,
  Languages,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Repeat2,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  Upload,
  WalletCards,
  X,
  AlertTriangle,
  Camera,
  Crown,
  Layers3,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type {
  AppData,
  Budget,
  Goal,
  Transaction,
  TxType,
} from "@/lib/finance-types";
import { migrateData } from "@/lib/finance-types";
import {
  BillsView,
  CalendarView,
  DebtsView,
  RecurringView,
  WalletsView,
} from "./advanced-features";
import { LockScreen, SecuritySettings, useAppSecurity } from "./security";
import { exportFinancialPdf } from "@/lib/pdf-report";
import {
  applyThemeColor,
  defaultPreferences,
  formatMoney,
  loadPreferences,
  savePreferences,
  type DisplayPreferences,
} from "@/lib/preferences";
import {
  firebaseClientReady,
  freeLimits,
  loadEntitlement,
  type PremiumEntitlement,
  type PremiumPlanId,
} from "@/lib/premium";
import { PremiumView } from "./premium";
import { usePremium } from "@/lib/use-premium";
import {
  deleteFinanceAccount,
  signInFinanceTrack,
  signOutFinanceTrack,
  subscribeFinanceAccount,
  subscribeFinanceData,
  uploadReceiptImage,
  uploadFinanceData,
} from "@/lib/firebase-client";
import {
  localDateKey,
  notifyRecurringCreated,
  processDueRecurring,
} from "@/lib/recurring";

type Section =
  | "ringkasan"
  | "transaksi"
  | "dompet"
  | "rutin"
  | "tagihan"
  | "utang"
  | "kalender"
  | "anggaran"
  | "tujuan"
  | "laporan"
  | "premium"
  | "pengaturan";
type ModalKind = "transaction" | "budget" | "goal" | null;
type Totals = {
  income: number;
  expense: number;
  balance: number;
  savingsRate: number;
};
type AppNotification = {
  id: string;
  title: string;
  detail: string;
  section: Section;
};
type SyncStatus = "offline" | "loading" | "syncing" | "synced" | "error";
type SyncState = {
  status: SyncStatus;
  lastSyncedAt: number | null;
  message?: string;
};

const today = new Date().toISOString().slice(0, 10);
const seedData: AppData = {
  transactions: [],
  budgets: [],
  goals: [],
  wallets: [],
  recurring: [],
  bills: [],
  debts: [],
};
function syncErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("permission-denied"))
    return "Akses Firestore ditolak. Periksa dan publikasikan Security Rules.";
  if (message.includes("unavailable") || message.includes("network"))
    return "Koneksi internet terputus. Data tetap aman di perangkat dan akan dicoba lagi.";
  if (message.includes("exceeds the maximum allowed size"))
    return "Data sinkron terlalu besar. Kurangi lampiran foto struk lalu coba lagi.";
  return message || "Sinkronisasi Firebase gagal.";
}
function hasFinanceData(data: AppData) {
  return (
    data.transactions.length +
      data.budgets.length +
      data.goals.length +
      data.wallets.length +
      data.recurring.length +
      data.bills.length +
      data.debts.length >
    0
  );
}
function mergeFinanceData(cloud: AppData, local: AppData): AppData {
  const merge = <T extends { id: string }>(remote: T[], device: T[]) =>
    Array.from(
      new Map([...remote, ...device].map((item) => [item.id, item])).values(),
    );
  return {
    transactions: merge(cloud.transactions, local.transactions),
    budgets: merge(cloud.budgets, local.budgets),
    goals: merge(cloud.goals, local.goals),
    wallets: merge(cloud.wallets, local.wallets),
    recurring: merge(cloud.recurring, local.recurring),
    bills: merge(cloud.bills, local.bills),
    debts: merge(cloud.debts, local.debts),
  };
}
const navItems = [
  { id: "ringkasan" as Section, label: "Ringkasan", icon: Home },
  { id: "transaksi" as Section, label: "Transaksi", icon: ReceiptText },
  { id: "dompet" as Section, label: "Multi-dompet", icon: WalletCards },
  { id: "rutin" as Section, label: "Transaksi berulang", icon: Repeat2 },
  { id: "tagihan" as Section, label: "Tagihan", icon: BellRing },
  { id: "utang" as Section, label: "Utang-piutang", icon: HandCoins },
  { id: "kalender" as Section, label: "Kalender", icon: CalendarDays },
  { id: "anggaran" as Section, label: "Anggaran", icon: WalletCards },
  { id: "tujuan" as Section, label: "Tujuan", icon: Target },
  { id: "laporan" as Section, label: "Laporan", icon: BarChart3 },
  { id: "premium" as Section, label: "FinanceTrack Premium", icon: Crown },
  { id: "pengaturan" as Section, label: "Pengaturan", icon: Settings },
];
function Logo() {
  return (
    <div className="logo">
      <span>
        <CircleDollarSign size={23} />
      </span>
      <div>
        <strong>FinanceTrack</strong>
        <small>Keuangan lebih terarah</small>
      </div>
    </div>
  );
}

function SyncIndicator({
  email,
  state,
  onRetry,
}: {
  email: string | null;
  state: SyncState;
  onRetry: () => void;
}) {
  if (!email) return null;
  const labels: Record<SyncStatus, string> = {
    offline: "Offline",
    loading: "Memuat data",
    syncing: "Menyinkronkan",
    synced: "Tersinkron",
    error: "Sinkron gagal",
  };
  const last = state.lastSyncedAt
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        day: "numeric",
        month: "short",
      }).format(new Date(state.lastSyncedAt))
    : "Belum pernah";
  const Icon =
    state.status === "synced"
      ? CheckCircle2
      : state.status === "error"
        ? CloudOff
        : state.status === "offline"
          ? Cloud
          : CloudUpload;
  return (
    <button
      type="button"
      className={`sync-indicator ${state.status}`}
      onClick={state.status === "error" ? onRetry : undefined}
      title={state.message || `Sinkron terakhir ${last}`}
    >
      <Icon />
      <span>
        <strong>{labels[state.status]}</strong>
        <small>
          {state.status === "error"
            ? "Ketuk untuk mencoba lagi"
            : `Terakhir ${last}`}
        </small>
      </span>
      {state.status === "error" && <RefreshCw />}
    </button>
  );
}

export default function HomePage() {
  const security = useAppSecurity();
  const [section, setSection] = useState<Section>("ringkasan");
  const [data, setData] = useState<AppData>(seedData);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [displayPrefs, setDisplayPrefs] =
    useState<DisplayPreferences>(defaultPreferences);
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>({
    active: false,
  });
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const premiumBilling = usePremium(accountUid, setEntitlement);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({
    status: "offline",
    lastSyncedAt: null,
  });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | TxType>("all");
  const [walletFilter, setWalletFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [currentDateLabel, setCurrentDateLabel] = useState("Hari ini");
  const importRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef<AppData>(seedData);
  const syncReadyRef = useRef(false);
  const remoteHashRef = useRef("");
  const localDirtyRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStorage.getItem("financetrack-data-v1");
      if (stored)
        try {
          const parsed = migrateData(JSON.parse(stored), seedData);
          const legacyIds = [
            "t1",
            "t2",
            "t3",
            "t4",
            "t5",
            "b1",
            "b2",
            "b3",
            "g1",
            "g2",
            "w1",
            "w2",
            "w3",
            "r1",
            "r2",
            "bl1",
            "bl2",
            "d1",
          ];
          const storedIds = [
            ...parsed.transactions,
            ...parsed.budgets,
            ...parsed.goals,
            ...parsed.wallets,
            ...parsed.recurring,
            ...parsed.bills,
            ...parsed.debts,
          ].map((item) => item.id);
          setData(
            storedIds.length === legacyIds.length &&
              storedIds.every((id) => legacyIds.includes(id))
              ? seedData
              : parsed,
          );
        } catch {
          /* keep empty data */
        }
      setDark(localStorage.getItem("financetrack-theme") === "dark");
      const prefs = loadPreferences();
      setDisplayPrefs(prefs);
      applyThemeColor(prefs.themeColor);
      setEntitlement(loadEntitlement());
      try {
        setReadNotificationIds(
          JSON.parse(
            localStorage.getItem("financetrack-read-notifications-v1") || "[]",
          ),
        );
      } catch {
        setReadNotificationIds([]);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    dataRef.current = data;
    if (ready) {
      localStorage.setItem("financetrack-data-v1", JSON.stringify(data));
      if (accountUid)
        localStorage.setItem(
          `financetrack-data-v1:${accountUid}`,
          JSON.stringify(data),
        );
    }
  }, [accountUid, data, ready]);
  useEffect(() => {
    if (!ready) return;
    const runDue = () => {
      const result = processDueRecurring(dataRef.current, localDateKey());
      if (!result.changed) return;
      dataRef.current = result.data;
      setData(result.data);
      if (result.created.length) {
        toast.success(
          result.created.length === 1
            ? `${result.created[0].title} dicatat otomatis`
            : `${result.created.length} transaksi rutin dicatat otomatis`,
        );
        void notifyRecurringCreated(result.created);
      }
    };
    runDue();
    const timer = window.setInterval(runDue, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") runDue();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", runDue);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", runDue);
    };
  }, [data.recurring, ready]);
  useEffect(() => {
    if (ready)
      localStorage.setItem(
        "financetrack-read-notifications-v1",
        JSON.stringify(readNotificationIds),
      );
  }, [readNotificationIds, ready]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    if (ready)
      localStorage.setItem("financetrack-theme", dark ? "dark" : "light");
  }, [dark, ready]);
  useEffect(() => {
    document.documentElement.lang = displayPrefs.language;
  }, [displayPrefs.language]);
  useEffect(() => {
    const updateCurrentDate = () =>
      setCurrentDateLabel(
        new Intl.DateTimeFormat(
          displayPrefs.language === "en" ? "en-US" : "id-ID",
          { weekday: "long", day: "numeric", month: "long", year: "numeric" },
        ).format(new Date()),
      );
    updateCurrentDate();
    const timer = window.setInterval(updateCurrentDate, 60_000);
    return () => window.clearInterval(timer);
  }, [displayPrefs.language]);
  useEffect(() => {
    if (!ready) return;
    const balance = data.wallets.reduce(
      (sum, wallet) => sum + wallet.balance,
      0,
    );
    void import("@capacitor/preferences")
      .then(({ Preferences }) =>
        Preferences.set({ key: "widget_balance", value: formatMoney(balance) }),
      )
      .catch(() => undefined);
  }, [data.wallets, displayPrefs.currency, ready]);
  useEffect(() => {
    let remove: (() => Promise<void>) | undefined;
    void import("@capacitor/app")
      .then(async ({ App }) => {
        const listener = await App.addListener("appUrlOpen", ({ url }) => {
          if (url.includes("financetrack://add")) setModal("transaction");
        });
        remove = () => listener.remove();
      })
      .catch(() => undefined);
    return () => {
      void remove?.();
    };
  }, []);
  useEffect(() => {
    if (!ready || !firebaseClientReady) return;
    let unsubscribe: (() => void) | undefined;
    void subscribeFinanceAccount((account) => {
      setAccountUid(account?.uid || null);
      setAccountEmail(account?.email || null);
      if (!account) {
        syncReadyRef.current = false;
        remoteHashRef.current = "";
        localDirtyRef.current = false;
        setSyncState({ status: "offline", lastSyncedAt: null });
      }
    })
      .then((stop) => {
        unsubscribe = stop;
      })
      .catch((error) =>
        setSyncState({
          status: "error",
          lastSyncedAt: null,
          message:
            error instanceof Error
              ? error.message
              : "Status akun tidak dapat diperiksa",
        }),
      );
    return () => unsubscribe?.();
  }, [ready]);
  const performUpload = useCallback(
    async (snapshot: AppData = dataRef.current) => {
      if (!accountUid) return;
      const hash = JSON.stringify(snapshot);
      setSyncState((previous) => ({
        ...previous,
        status: "syncing",
        message: undefined,
      }));
      try {
        await uploadFinanceData(snapshot);
        const syncedAt = Date.now();
        remoteHashRef.current = hash;
        localDirtyRef.current = false;
        localStorage.setItem(`financetrack-cloud-hash-v1:${accountUid}`, hash);
        localStorage.setItem("financetrack-last-account-v1", accountUid);
        localStorage.setItem(
          `financetrack-last-sync-v1:${accountUid}`,
          String(syncedAt),
        );
        setSyncState({ status: "synced", lastSyncedAt: syncedAt });
      } catch (error) {
        localDirtyRef.current = true;
        setSyncState((previous) => ({
          ...previous,
          status: "error",
          message: syncErrorMessage(error),
        }));
      }
    },
    [accountUid],
  );
  useEffect(() => {
    if (!ready || !accountUid || !firebaseClientReady) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    syncReadyRef.current = false;
    remoteHashRef.current = "";
    localDirtyRef.current = false;
    const savedSync =
      Number(
        localStorage.getItem(`financetrack-last-sync-v1:${accountUid}`) || 0,
      ) || null;
    setSyncState({ status: "loading", lastSyncedAt: savedSync });
    void subscribeFinanceData(
      async (cloud) => {
        if (!active) return;
        if (cloud.pendingWrites) {
          setSyncState((previous) => ({
            ...previous,
            status: "syncing",
            message: undefined,
          }));
          return;
        }
        if (!cloud.data) {
          if (syncReadyRef.current) {
            remoteHashRef.current = JSON.stringify(seedData);
            dataRef.current = seedData;
            setData(seedData);
            setSyncState({
              status: "synced",
              lastSyncedAt: cloud.updatedAt || Date.now(),
            });
            return;
          }
          const previousUid = localStorage.getItem(
            "financetrack-last-account-v1",
          );
          const stored = localStorage.getItem(
            `financetrack-data-v1:${accountUid}`,
          );
          let initial = dataRef.current;
          if (previousUid && previousUid !== accountUid) initial = seedData;
          else if (stored) {
            try {
              initial = migrateData(JSON.parse(stored), seedData);
            } catch {
              /* use current local data */
            }
          }
          dataRef.current = initial;
          setData(initial);
          syncReadyRef.current = true;
          localDirtyRef.current = true;
          await performUpload(initial);
          return;
        }
        const incoming = migrateData(cloud.data, seedData);
        const incomingHash = JSON.stringify(incoming);
        if (!syncReadyRef.current) {
          const previousUid = localStorage.getItem(
            "financetrack-last-account-v1",
          );
          const stored = localStorage.getItem(
            `financetrack-data-v1:${accountUid}`,
          );
          const deviceStored = localStorage.getItem("financetrack-data-v1");
          const lastCloudHash = localStorage.getItem(
            `financetrack-cloud-hash-v1:${accountUid}`,
          );
          let pendingLocal: AppData | null = null;
          if (stored && lastCloudHash) {
            try {
              const candidate = migrateData(JSON.parse(stored), seedData);
              if (JSON.stringify(candidate) !== lastCloudHash)
                pendingLocal = candidate;
            } catch {
              /* use cloud data */
            }
          }
          if (
            !pendingLocal &&
            previousUid === accountUid &&
            deviceStored &&
            lastCloudHash
          ) {
            try {
              const candidate = migrateData(JSON.parse(deviceStored), seedData);
              if (JSON.stringify(candidate) !== lastCloudHash)
                pendingLocal = candidate;
            } catch {
              /* use cloud data */
            }
          }
          if (
            !pendingLocal &&
            !previousUid &&
            hasFinanceData(dataRef.current)
          ) {
            pendingLocal = mergeFinanceData(incoming, dataRef.current);
          }
          syncReadyRef.current = true;
          remoteHashRef.current = incomingHash;
          if (pendingLocal) {
            dataRef.current = pendingLocal;
            localDirtyRef.current = true;
            setData(pendingLocal);
            await performUpload(pendingLocal);
            return;
          }
        } else if (
          localDirtyRef.current &&
          incomingHash !== JSON.stringify(dataRef.current)
        ) {
          await performUpload(dataRef.current);
          return;
        }
        remoteHashRef.current = incomingHash;
        localDirtyRef.current = false;
        dataRef.current = incoming;
        localStorage.setItem(
          `financetrack-data-v1:${accountUid}`,
          incomingHash,
        );
        localStorage.setItem(
          `financetrack-cloud-hash-v1:${accountUid}`,
          incomingHash,
        );
        localStorage.setItem("financetrack-last-account-v1", accountUid);
        if (cloud.updatedAt)
          localStorage.setItem(
            `financetrack-last-sync-v1:${accountUid}`,
            String(cloud.updatedAt),
          );
        setData(incoming);
        setSyncState({
          status: "synced",
          lastSyncedAt: cloud.updatedAt || Date.now(),
        });
      },
      (error) => {
        if (active)
          setSyncState((previous) => ({
            ...previous,
            status: "error",
            message: syncErrorMessage(error),
          }));
      },
    )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch((error) => {
        if (active)
          setSyncState((previous) => ({
            ...previous,
            status: "error",
            message: syncErrorMessage(error),
          }));
      });
    return () => {
      active = false;
      unsubscribe?.();
      syncReadyRef.current = false;
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [accountUid, performUpload, ready]);
  useEffect(() => {
    if (!ready || !accountUid || !syncReadyRef.current) return;
    const hash = JSON.stringify(data);
    if (hash === remoteHashRef.current) {
      localDirtyRef.current = false;
      return;
    }
    localDirtyRef.current = true;
    setSyncState((previous) => ({
      ...previous,
      status: "syncing",
      message: undefined,
    }));
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(
      () => void performUpload(data),
      800,
    );
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [accountUid, data, performUpload, ready]);
  const updateDisplayPrefs = (next: DisplayPreferences) => {
    setDisplayPrefs(next);
    savePreferences(next);
    applyThemeColor(next.themeColor);
  };
  const openEntry = (kind: ModalKind) => {
    if (kind === "transaction" && !data.wallets.length) {
      setSection("dompet");
      toast.info("Buat dompet terlebih dahulu sebelum mencatat transaksi.");
      return;
    }
    const limited =
      (kind === "budget" && data.budgets.length >= freeLimits.budgets) ||
      (kind === "goal" && data.goals.length >= freeLimits.goals);
    if (!entitlement.active && limited) {
      setSection("premium");
      toast.info(
        "Batas paket Gratis tercapai. Pilih Premium untuk menambah tanpa batas.",
      );
      return;
    }
    if (kind === "transaction") setEditingTransaction(null);
    setModal(kind);
  };
  const requirePremium = (message: string) => {
    setSection("premium");
    toast.info(message);
  };
  const choosePremium = (plan: PremiumPlanId) => void premiumBilling.purchase(plan);
  const connectFirebase = async () => {
    setSyncState((previous) => ({
      ...previous,
      status: "loading",
      message: undefined,
    }));
    try {
      const user = await signInFinanceTrack();
      setAccountUid(user.uid);
      setAccountEmail(user.email);
      toast.success(`Akun ${user.email || "Google"} berhasil dihubungkan`);
    } catch (error) {
      setSyncState((previous) => ({
        ...previous,
        status: "error",
        message: syncErrorMessage(error),
      }));
      toast.error(
        error instanceof Error
          ? error.message
          : "Akun Google tidak dapat dihubungkan",
      );
    }
  };
  const disconnectFirebase = async () => {
    try {
      await signOutFinanceTrack();
      setAccountUid(null);
      setAccountEmail(null);
      setSyncState({ status: "offline", lastSyncedAt: null });
      toast.success("Akun Google telah dikeluarkan");
    } catch {
      toast.error("Akun tidak dapat dikeluarkan");
    }
  };
  const clearAllData = () => {
    setData({
      transactions: [],
      budgets: [],
      goals: [],
      wallets: [],
      recurring: [],
      bills: [],
      debts: [],
    });
    localStorage.removeItem("financetrack-entitlement-v1");
    setEntitlement({ active: false });
  };
  const clearLocalAccountData = async () => {
    setAccountUid(null);
    setAccountEmail(null);
    setSyncState({ status: "offline", lastSyncedAt: null });
    syncReadyRef.current = false;
    remoteHashRef.current = "";
    localDirtyRef.current = false;
    clearAllData();
    setReadNotificationIds([]);
    setDisplayPrefs(defaultPreferences);
    setDark(false);
    applyThemeColor(defaultPreferences.themeColor);
    security.clearSecurity();
    Object.keys(localStorage)
      .filter((key) => key.startsWith("financetrack-"))
      .forEach((key) => localStorage.removeItem(key));
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("financetrack-"))
      .forEach((key) => sessionStorage.removeItem(key));
    await import("@capacitor/preferences")
      .then(({ Preferences }) => Preferences.clear())
      .catch(() => undefined);
  };
  const removeAccount = async () => {
    if (!accountEmail) {
      toast.info("Masuk dengan Google terlebih dahulu untuk menghapus akun.");
      return;
    }
    if (
      !confirm(
        "Hapus akun Google FinanceTrack dan seluruh data terkait secara permanen? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;
    if (deletingAccount) return;
    try {
      setDeletingAccount(true);
      const report = await deleteFinanceAccount();
      await clearLocalAccountData();
      toast.success(
        `Akun dihapus: ${report.firestoreDocuments} dokumen dan ${report.storageObjects} foto cloud dibersihkan`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Akun tidak dapat dihapus";
      toast.error(
        message.includes("requires-recent-login")
          ? "Untuk keamanan, keluar lalu masuk kembali sebelum menghapus akun."
          : message,
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const totals = useMemo<Totals>(() => {
    const month = today.slice(0, 7);
    const current = data.transactions.filter((t) => t.date.startsWith(month));
    const income = current
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = current
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
      savingsRate: income ? Math.round(((income - expense) / income) * 100) : 0,
    };
  }, [data.transactions]);
  const notifications = useMemo<AppNotification[]>(() => {
    const result: AppNotification[] = [];
    const currentDay = localDateKey();
    data.transactions
      .filter((transaction) => transaction.automatic && transaction.date === currentDay)
      .forEach((transaction) =>
        result.push({
          id: `recurring-created-${transaction.id}`,
          title: `${transaction.title} dicatat otomatis`,
          detail: `${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"} ${formatMoney(transaction.amount)} · ${transaction.category}`,
          section: "rutin",
        }),
      );
    data.bills
      .filter((b) => !b.paid)
      .forEach((b) =>
        result.push({
          id: `bill-${b.id}-${b.dueDate}`,
          title:
            b.dueDate < today
              ? `Tagihan ${b.title} terlambat`
              : `Tagihan ${b.title} belum dibayar`,
          detail: `Jatuh tempo ${new Date(`${b.dueDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · ${formatMoney(b.amount)}`,
          section: "tagihan",
        }),
      );
    data.budgets
      .filter((b) => b.limit > 0 && b.spent / b.limit >= 0.8)
      .forEach((b) =>
        result.push({
          id: `budget-${b.id}-${b.spent}`,
          title: `Anggaran ${b.category} hampir habis`,
          detail: `Sudah terpakai ${Math.min(100, Math.round((b.spent / b.limit) * 100))}% dari ${formatMoney(b.limit)}`,
          section: "anggaran",
        }),
      );
    data.debts
      .filter((d) => !d.paid && d.dueDate <= today)
      .forEach((d) =>
        result.push({
          id: `debt-${d.id}-${d.dueDate}`,
          title: `${d.type === "receivable" ? "Piutang" : "Utang"} ${d.name} sudah jatuh tempo`,
          detail: `${formatMoney(d.amount)} · ${new Date(`${d.dueDate}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`,
          section: "utang",
        }),
      );
    data.goals
      .filter((g) => g.target > 0 && g.saved >= g.target)
      .forEach((g) =>
        result.push({
          id: `goal-${g.id}-complete`,
          title: `Tujuan ${g.title} tercapai`,
          detail: `Target ${formatMoney(g.target)} sudah terkumpul.`,
          section: "tujuan",
        }),
      );
    return result;
  }, [data.bills, data.budgets, data.debts, data.goals, data.transactions]);
  const unreadNotifications = notifications.filter(
    (item) => !readNotificationIds.includes(item.id),
  );
  const markNotificationsRead = () =>
    setReadNotificationIds((ids) =>
      Array.from(new Set([...ids, ...notifications.map((item) => item.id)])),
    );
  const filtered = useMemo(
    () =>
      data.transactions
        .filter((t) => {
          const matchesType = txFilter === "all" || t.type === txFilter;
          const matchesWallet =
            walletFilter === "all" || t.walletId === walletFilter;
          const matchesCategory =
            categoryFilter === "all" || t.category === categoryFilter;
          const matchesDate =
            (!dateStart || t.date >= dateStart) &&
            (!dateEnd || t.date <= dateEnd);
          return (
            matchesType &&
            matchesWallet &&
            matchesCategory &&
            matchesDate &&
            `${t.title} ${t.category} ${t.note || ""}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [
      data.transactions,
      query,
      txFilter,
      walletFilter,
      categoryFilter,
      dateStart,
      dateEnd,
    ],
  );

  const go = (id: Section) => {
    setSection(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const titles: Record<Section, string> =
    displayPrefs.language === "en"
      ? {
          ringkasan: "Welcome back",
          transaksi: "All transactions",
          dompet: "Wallets",
          rutin: "Recurring transactions",
          tagihan: "Bills and reminders",
          utang: "Debts and receivables",
          kalender: "Transaction calendar",
          anggaran: "Monthly budgets",
          tujuan: "Financial goals",
          laporan: "Financial reports",
          premium: "FinanceTrack Premium",
          pengaturan: "Settings",
        }
      : {
          ringkasan: "Selamat datang kembali",
          transaksi: "Semua transaksi",
          dompet: "Multi-dompet",
          rutin: "Transaksi berulang",
          tagihan: "Tagihan dan pengingat",
          utang: "Utang-piutang",
          kalender: "Kalender transaksi",
          anggaran: "Anggaran bulanan",
          tujuan: "Tujuan keuangan",
          laporan: "Laporan keuangan",
          premium: "FinanceTrack Premium",
          pengaturan: "Pengaturan",
        };
  const removeTransaction = (id: string) => {
    setData((d) => {
      const tx = d.transactions.find((t) => t.id === id);
      return {
        ...d,
        transactions: d.transactions.filter((t) => t.id !== id),
        wallets: tx?.walletId
          ? d.wallets.map((w) =>
              w.id === tx.walletId
                ? {
                    ...w,
                    balance:
                      w.balance +
                      (tx.type === "income" ? -tx.amount : tx.amount),
                  }
                : w,
            )
          : d.wallets,
        budgets:
          tx?.type === "expense"
            ? d.budgets.map((b) =>
                b.category === tx.category
                  ? { ...b, spent: Math.max(0, b.spent - tx.amount) }
                  : b,
              )
            : d.budgets,
      };
    });
    toast.success("Transaksi dihapus");
  };
  const editTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModal("transaction");
  };
  const updateTransaction = (updated: Transaction) => {
    setData((d) => {
      const previous = d.transactions.find(
        (transaction) => transaction.id === updated.id,
      );
      if (!previous) return d;
      const wallets = d.wallets.map((wallet) => {
        let balance = wallet.balance;
        if (previous.walletId === wallet.id)
          balance +=
            previous.type === "income" ? -previous.amount : previous.amount;
        if (updated.walletId === wallet.id)
          balance +=
            updated.type === "income" ? updated.amount : -updated.amount;
        return { ...wallet, balance };
      });
      const budgets = d.budgets.map((budget) => {
        let spent = budget.spent;
        if (
          previous.type === "expense" &&
          previous.category === budget.category
        )
          spent -= previous.amount;
        if (updated.type === "expense" && updated.category === budget.category)
          spent += updated.amount;
        return { ...budget, spent: Math.max(0, spent) };
      });
      return {
        ...d,
        transactions: d.transactions.map((transaction) =>
          transaction.id === updated.id ? updated : transaction,
        ),
        wallets,
        budgets,
      };
    });
    toast.success("Transaksi berhasil diperbarui");
  };
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      `financetrack-backup-${today}.json`,
    );
    toast.success("Cadangan berhasil diunduh");
  };
  const exportCsv = () => {
    const rows = [
      ["Tanggal", "Nama", "Kategori", "Jenis", "Jumlah"],
      ...data.transactions.map((t) => [
        t.date,
        t.title,
        t.category,
        t.type === "income" ? "Pemasukan" : "Pengeluaran",
        String(t.amount),
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadBlob(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
      `transaksi-${today}.csv`,
    );
    toast.success("Laporan CSV berhasil diunduh");
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const next = JSON.parse(await file.text()) as AppData;
      if (
        !Array.isArray(next.transactions) ||
        !Array.isArray(next.budgets) ||
        !Array.isArray(next.goals)
      )
        throw new Error();
      setData(migrateData(next, seedData));
      toast.success("Data berhasil dipulihkan");
    } catch {
      toast.error("File cadangan tidak valid");
    }
  };

  if (!security.loaded)
    return (
      <div className="app-loading">
        <CircleDollarSign />
        <span>FinanceTrack</span>
      </div>
    );
  if (security.locked)
    return (
      <LockScreen
        verifyPin={security.verifyPin}
        onBiometric={security.unlockBiometric}
        biometric={security.settings.biometricEnabled}
      />
    );

  return (
    <div className="app-shell">
      <aside className={`side-panel ${menuOpen ? "is-open" : ""}`}>
        <div className="side-head">
          <Logo />
          <button
            className="mobile-close"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav className="main-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={section === item.id ? "active" : ""}
            >
              <item.icon size={19} />
              <span>
                {displayPrefs.language === "en"
                  ? (
                      {
                        ringkasan: "Overview",
                        transaksi: "Transactions",
                        dompet: "Wallets",
                        rutin: "Recurring transactions",
                        tagihan: "Bills",
                        utang: "Debts",
                        kalender: "Calendar",
                        anggaran: "Budgets",
                        tujuan: "Goals",
                        laporan: "Reports",
                        premium: "FinanceTrack Premium",
                        pengaturan: "Settings",
                      } as Record<Section, string>
                    )[item.id]
                  : item.label}
              </span>
              {section === item.id && <i />}
            </button>
          ))}
        </nav>
        {!entitlement.active && (
          <button className="upgrade-card" onClick={() => go("premium")}>
            <Crown />
            <span>
              <strong>Coba Premium</strong>
              <small>Mulai Rp19.000/bulan</small>
            </span>
            <ChevronRight />
          </button>
        )}
        <div className="privacy-card">
          <ShieldCheck size={19} />
          <div>
            <strong>Data tetap milik Anda</strong>
            <p>Tersimpan di perangkat ini.</p>
          </div>
        </div>
        <button className="profile-card" onClick={() => go("pengaturan")}>
          <span className="avatar">FT</span>
          <span>
            <strong>{accountEmail || "Pengguna FinanceTrack"}</strong>
            <small>
              {accountEmail ? "Akun Google terhubung" : "Perangkat lokal"}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>
      </aside>
      {menuOpen && (
        <button
          aria-label="Tutup menu"
          className="menu-scrim"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="title-wrap">
            <button
              className="menu-button"
              aria-label="Buka menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </button>
            <div>
              <p>
                {section === "ringkasan" ? currentDateLabel : "FinanceTrack"}
              </p>
              <h1>{titles[section]}</h1>
            </div>
          </div>
          <div className="top-actions">
            <SyncIndicator
              email={accountEmail}
              state={syncState}
              onRetry={() => void performUpload()}
            />
            <button
              aria-label="Ganti tema"
              className="icon-button theme-button"
              onClick={() => setDark((v) => !v)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) markNotificationsRead();
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  aria-label={`Notifikasi${unreadNotifications.length ? ` (${unreadNotifications.length} belum dibaca)` : ""}`}
                  className="icon-button notification"
                >
                  <Bell size={19} />
                  {unreadNotifications.length > 0 && <span />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="notification-panel" align="end">
                <div className="notification-head">
                  <div>
                    <strong>Notifikasi</strong>
                    <small>
                      {notifications.length
                        ? `${notifications.length} pemberitahuan`
                        : "Semua aman"}
                    </small>
                  </div>
                  {unreadNotifications.length > 0 && (
                    <button type="button" onClick={markNotificationsRead}>
                      Tandai dibaca
                    </button>
                  )}
                </div>
                <div className="notification-list">
                  {notifications.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      className="notification-item"
                      onSelect={() => go(item.section)}
                    >
                      <span
                        className={
                          readNotificationIds.includes(item.id) ? "is-read" : ""
                        }
                      >
                        <BellRing />
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {!notifications.length && (
                    <div className="notification-empty">
                      <Bell />
                      <strong>Tidak ada notifikasi</strong>
                      <small>
                        Tagihan, anggaran, dan tujuan yang perlu diperhatikan
                        akan muncul di sini.
                      </small>
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="primary-action"
              onClick={() => openEntry("transaction")}
            >
              <Plus size={18} />
              Catat transaksi
            </Button>
          </div>
        </header>
        <div className="content">
          {section === "ringkasan" && (
            <Dashboard
              data={data}
              totals={totals}
              onNavigate={go}
              onAdd={openEntry}
            />
          )}
          {section === "transaksi" && (
            <Transactions
              data={data}
              items={filtered}
              query={query}
              setQuery={setQuery}
              filter={txFilter}
              setFilter={setTxFilter}
              walletFilter={walletFilter}
              setWalletFilter={setWalletFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              dateStart={dateStart}
              setDateStart={setDateStart}
              dateEnd={dateEnd}
              setDateEnd={setDateEnd}
              onAdd={() => openEntry("transaction")}
              onEdit={editTransaction}
              onRemove={removeTransaction}
            />
          )}
          {section === "dompet" && (
            <WalletsView
              data={data}
              setData={setData}
              language={displayPrefs.language}
              canAdd={
                entitlement.active || data.wallets.length < freeLimits.wallets
              }
              onLimit={() =>
                requirePremium(
                  `Paket Gratis mendukung maksimal ${freeLimits.wallets} dompet.`,
                )
              }
            />
          )}
          {section === "rutin" && (
            <RecurringView
              data={data}
              setData={setData}
              canAdd={
                entitlement.active ||
                data.recurring.length < freeLimits.recurring
              }
              onLimit={() =>
                requirePremium(
                  "Batas transaksi berulang paket Gratis tercapai.",
                )
              }
            />
          )}
          {section === "tagihan" && (
            <BillsView
              data={data}
              setData={setData}
              canAdd={
                entitlement.active || data.bills.length < freeLimits.bills
              }
              onLimit={() =>
                requirePremium("Batas pengingat paket Gratis tercapai.")
              }
            />
          )}
          {section === "utang" && <DebtsView data={data} setData={setData} />}
          {section === "kalender" && <CalendarView data={data} />}
          {section === "anggaran" && (
            <Budgets
              items={data.budgets}
              language={displayPrefs.language}
              onAdd={() => openEntry("budget")}
              onUpdate={(budget) => {
                setData((d) => ({
                  ...d,
                  budgets: d.budgets.map((b) =>
                    b.id === budget.id ? budget : b,
                  ),
                }));
                toast.success(
                  displayPrefs.language === "en"
                    ? "Budget updated"
                    : "Anggaran berhasil diperbarui",
                );
              }}
              onRemove={(id) => {
                setData((d) => ({
                  ...d,
                  budgets: d.budgets.filter((b) => b.id !== id),
                }));
                toast.success("Anggaran dihapus");
              }}
            />
          )}
          {section === "tujuan" && (
            <Goals
              items={data.goals}
              language={displayPrefs.language}
              onAdd={() => openEntry("goal")}
              setData={setData}
              onUpdate={(goal) => {
                setData((d) => ({
                  ...d,
                  goals: d.goals.map((g) => (g.id === goal.id ? goal : g)),
                }));
                toast.success(
                  displayPrefs.language === "en"
                    ? "Goal updated"
                    : "Tujuan berhasil diperbarui",
                );
              }}
              onRemove={(id) => {
                setData((d) => ({
                  ...d,
                  goals: d.goals.filter((g) => g.id !== id),
                }));
                toast.success("Tujuan dihapus");
              }}
            />
          )}
          {section === "laporan" && (
            <Reports
              totals={totals}
              data={data}
              onCsv={exportCsv}
              onPdf={() =>
                entitlement.active
                  ? void exportFinancialPdf(data, displayPrefs.currency)
                  : requirePremium(
                      "Ekspor PDF tersedia di FinanceTrack Premium.",
                    )
              }
            />
          )}
          {section === "premium" && (
            <PremiumView
              active={entitlement.active}
              firebaseReady={firebaseClientReady}
              connected={Boolean(accountUid)}
              {...premiumBilling}
              onRestore={() => void premiumBilling.restore()}
              onManage={() => void premiumBilling.manage()}
              onChoose={choosePremium}
              onConnect={() => void connectFirebase()}
            />
          )}
          {section === "pengaturan" && (
            <>
              <section className="panel settings-card language-card">
                <PanelTitle
                  title={displayPrefs.language === "en" ? "Language" : "Bahasa"}
                  subtitle={
                    displayPrefs.language === "en"
                      ? "Choose the app interface language"
                      : "Pilih bahasa tampilan aplikasi"
                  }
                />
                <div className="setting-row static-row">
                  <span className="setting-icon">
                    <Languages />
                  </span>
                  <span>
                    <strong>
                      {displayPrefs.language === "en"
                        ? "Interface language"
                        : "Bahasa antarmuka"}
                    </strong>
                    <small>
                      {displayPrefs.language === "en"
                        ? "Changes are saved automatically"
                        : "Perubahan tersimpan otomatis"}
                    </small>
                  </span>
                  <Select
                    value={displayPrefs.language}
                    onValueChange={(language) =>
                      updateDisplayPrefs({
                        ...displayPrefs,
                        language: language as DisplayPreferences["language"],
                      })
                    }
                  >
                    <SelectTrigger className="language-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>
              <Preferences
                dark={dark}
                setDark={setDark}
                displayPrefs={displayPrefs}
                updateDisplayPrefs={updateDisplayPrefs}
                exportJson={exportJson}
                importRef={importRef}
                importData={importData}
                security={security}
                accountEmail={accountEmail}
                syncState={syncState}
                syncNow={() => void performUpload()}
                connectAccount={() => void connectFirebase()}
                disconnectAccount={() => void disconnectFirebase()}
                deleteAccount={() => void removeAccount()}
                deletingAccount={deletingAccount}
                reset={() => {
                  clearAllData();
                  toast.success("Semua data telah dikosongkan");
                }}
              />
            </>
          )}
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Navigasi ponsel">
        {navItems
          .filter((item) =>
            [
              "ringkasan",
              "transaksi",
              "dompet",
              "kalender",
              "laporan",
            ].includes(item.id),
          )
          .map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <item.icon size={20} />
              <span>
                {item.label === "Multi-dompet" ? "Dompet" : item.label}
              </span>
            </button>
          ))}
      </nav>
      <EntryDialog
        key={editingTransaction?.id || modal || "closed"}
        kind={modal}
        editingTransaction={editingTransaction}
        close={() => {
          setModal(null);
          setEditingTransaction(null);
        }}
        data={data}
        setData={setData}
        onUpdate={updateTransaction}
      />
    </div>
  );
}

function Dashboard({
  data,
  totals,
  onNavigate,
  onAdd,
}: {
  data: AppData;
  totals: Totals;
  onNavigate: (s: Section) => void;
  onAdd: (m: ModalKind) => void;
}) {
  const recent = [...data.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const totalBudget = data.budgets.reduce((s, b) => s + b.limit, 0);
  const usedBudget = data.budgets.reduce((s, b) => s + b.spent, 0);
  const now = new Date();
  const elapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const walletBalance = data.wallets.reduce(
    (sum, wallet) => sum + wallet.balance,
    0,
  );
  const forecastBalance =
    walletBalance + (totals.balance / elapsed) * (daysInMonth - elapsed);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekStartKey = weekStart.toISOString().slice(0, 10);
  const weekly = data.transactions.filter(
    (t) => t.date >= weekStartKey && t.date <= today,
  );
  const weeklyExpense = weekly
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseCategories = data.transactions
    .filter((t) => t.type === "expense")
    .reduce<Record<string, { count: number; amount: number }>>(
      (acc, t) => ({
        ...acc,
        [t.category]: {
          count: (acc[t.category]?.count || 0) + 1,
          amount: (acc[t.category]?.amount || 0) + t.amount,
        },
      }),
      {},
    );
  const topHabit = Object.entries(expenseCategories).sort(
    (a, b) => b[1].amount - a[1].amount,
  )[0];
  const budgetAlerts = data.budgets.filter(
    (b) => b.limit > 0 && b.spent / b.limit >= 0.8,
  );
  const monthlyChart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const tx = data.transactions.filter((item) => item.date.startsWith(key));
    return {
      month: date.toLocaleDateString("id-ID", { month: "short" }),
      masuk:
        tx
          .filter((item) => item.type === "income")
          .reduce((sum, item) => sum + item.amount, 0) / 1_000_000,
      keluar:
        tx
          .filter((item) => item.type === "expense")
          .reduce((sum, item) => sum + item.amount, 0) / 1_000_000,
    };
  });
  if (!data.wallets.length)
    return (
      <section className="panel first-run-card">
        <span className="first-run-icon">
          <WalletCards />
        </span>
        <div>
          <p>Mulai dari langkah pertama</p>
          <h2>Atur keuangan dari dompet pertama Anda</h2>
          <span>
            Saldo awal adalah Rp0. Tambahkan dompet tunai, rekening bank, atau
            e-wallet untuk mulai mencatat keuangan.
          </span>
        </div>
        <Button onClick={() => onNavigate("dompet")}>
          <Plus />
          Buat dompet
        </Button>
      </section>
    );
  if (!data.transactions.length)
    return (
      <>
        <section className="balance-hero">
          <div className="balance-copy">
            <p>Total saldo semua dompet</p>
            <h2>{formatMoney(walletBalance)}</h2>
            <span>Belum ada transaksi tercatat</span>
          </div>
          <span className="hero-orbit orbit-one" />
          <span className="hero-orbit orbit-two" />
        </section>
        <section className="panel first-run-card transaction-first">
          <span className="first-run-icon">
            <ReceiptText />
          </span>
          <div>
            <p>Dompet sudah siap</p>
            <h2>Catat transaksi pertama</h2>
            <span>
              Tambahkan pemasukan atau pengeluaran agar ringkasan dan laporan
              mulai terbentuk.
            </span>
          </div>
          <Button onClick={() => onAdd("transaction")}>
            <Plus />
            Catat transaksi pertama
          </Button>
        </section>
      </>
    );
  return (
    <>
      <section className="balance-hero">
        <div className="balance-copy">
          <p>Saldo bersih bulan ini</p>
          <h2>{formatMoney(totals.balance)}</h2>
          <span className="trend">
            <ArrowUpRight size={15} /> 12,4% dibanding bulan lalu
          </span>
        </div>
        <div className="balance-stats">
          <div>
            <span className="stat-icon income">
              <ArrowDownLeft />
            </span>
            <p>Pemasukan</p>
            <strong>{formatMoney(totals.income)}</strong>
          </div>
          <div>
            <span className="stat-icon expense">
              <ArrowUpRight />
            </span>
            <p>Pengeluaran</p>
            <strong>{formatMoney(totals.expense)}</strong>
          </div>
          <div className="saving-rate">
            <div
              className="mini-ring"
              style={
                {
                  "--value": `${Math.max(0, Math.min(100, totals.savingsRate)) * 3.6}deg`,
                } as React.CSSProperties
              }
            >
              <span>{totals.savingsRate}%</span>
            </div>
            <span>
              <p>Rasio tabungan</p>
              <strong>Bagus sekali</strong>
            </span>
          </div>
        </div>
        <span className="hero-orbit orbit-one" />
        <span className="hero-orbit orbit-two" />
      </section>
      <div className="quick-actions">
        <button onClick={() => onAdd("transaction")}>
          <span className="quick-icon purple">
            <Plus />
          </span>
          <span>
            <strong>Catat transaksi</strong>
            <small>Tambah pemasukan atau pengeluaran</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => onAdd("budget")}>
          <span className="quick-icon green">
            <WalletCards />
          </span>
          <span>
            <strong>Buat anggaran</strong>
            <small>Atur batas pengeluaran</small>
          </span>
          <ChevronRight />
        </button>
        <button onClick={() => onAdd("goal")}>
          <span className="quick-icon orange">
            <Flag />
          </span>
          <span>
            <strong>Tambah tujuan</strong>
            <small>Wujudkan rencana Anda</small>
          </span>
          <ChevronRight />
        </button>
      </div>
      <div className="insight-grid">
        <article className="panel insight-card">
          <span className="metric-icon purple">
            <TrendingUp />
          </span>
          <div>
            <p>Prediksi saldo akhir bulan</p>
            <strong>{formatMoney(forecastBalance)}</strong>
            <small>Berdasarkan ritme transaksi bulan ini</small>
          </div>
        </article>
        <article className="panel insight-card">
          <span className="metric-icon green">
            <CalendarDays />
          </span>
          <div>
            <p>Rekap 7 hari terakhir</p>
            <strong>{formatMoney(weeklyExpense)}</strong>
            <small>{weekly.length} transaksi tercatat</small>
          </div>
        </article>
        <article className="panel insight-card">
          <span className="metric-icon orange">
            <Sparkles />
          </span>
          <div>
            <p>Kebiasaan belanja</p>
            <strong>{topHabit?.[0] || "Belum ada data"}</strong>
            <small>
              {topHabit
                ? `${topHabit[1].count}x · ${formatMoney(topHabit[1].amount)}`
                : "Catat transaksi untuk melihat pola"}
            </small>
          </div>
        </article>
      </div>
      {budgetAlerts.length > 0 && (
        <section className="budget-alert">
          <AlertTriangle />
          <div>
            <strong>Anggaran hampir habis</strong>
            <p>
              {budgetAlerts
                .map(
                  (b) =>
                    `${b.category} ${Math.round((b.spent / b.limit) * 100)}%`,
                )
                .join(" · ")}
            </p>
          </div>
          <button onClick={() => onNavigate("anggaran")}>Periksa</button>
        </section>
      )}
      <div className="dashboard-grid">
        <section className="panel cash-panel">
          <PanelTitle
            title="Arus kas"
            subtitle="6 bulan terakhir"
            action="Lihat laporan"
            onAction={() => onNavigate("laporan")}
          />
          <div className="chart-legend">
            <span>
              <i className="dot income-dot" />
              Pemasukan
            </span>
            <span>
              <i className="dot expense-dot" />
              Pengeluaran
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyChart}
                margin={{ top: 10, right: 5, bottom: 0, left: -24 }}
              >
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d5dfc" stopOpacity={0.23} />
                    <stop offset="100%" stopColor="#6d5dfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--line)"
                  strokeDasharray="4 5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-ink)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-ink)", fontSize: 11 }}
                  tickFormatter={(v) => `${v}jt`}
                />
                <Tooltip
                  formatter={(v) => [`Rp${v} juta`, ""]}
                  contentStyle={{
                    borderRadius: 14,
                    borderColor: "var(--line)",
                    background: "var(--panel)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="masuk"
                  stroke="#6d5dfc"
                  strokeWidth={3}
                  fill="url(#incomeFill)"
                />
                <Area
                  type="monotone"
                  dataKey="keluar"
                  stroke="#f08b70"
                  strokeWidth={2.5}
                  fill="transparent"
                  strokeDasharray="6 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel budget-panel">
          <PanelTitle
            title="Anggaran"
            subtitle={`${data.budgets.length} kategori aktif`}
            action="Kelola"
            onAction={() => onNavigate("anggaran")}
          />
          <div className="budget-summary">
            <div
              className="budget-donut"
              style={
                {
                  "--used": `${totalBudget ? (usedBudget / totalBudget) * 360 : 0}deg`,
                } as React.CSSProperties
              }
            >
              <span>
                <strong>
                  {totalBudget
                    ? Math.round((usedBudget / totalBudget) * 100)
                    : 0}
                  %
                </strong>
                <small>terpakai</small>
              </span>
            </div>
            <div>
              <p>Sisa anggaran</p>
              <strong>
                {formatMoney(Math.max(0, totalBudget - usedBudget))}
              </strong>
              <small>dari {formatMoney(totalBudget)}</small>
            </div>
          </div>
          <div className="mini-budgets">
            {data.budgets.slice(0, 3).map((b) => (
              <div key={b.id}>
                <div>
                  <span>
                    <i style={{ background: b.color }} />
                    {b.category}
                  </span>
                  <small>{Math.round((b.spent / b.limit) * 100)}%</small>
                </div>
                <Progress value={Math.min(100, (b.spent / b.limit) * 100)} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel transactions-panel">
        <PanelTitle
          title="Transaksi terbaru"
          subtitle="Aktivitas keuangan terakhir"
          action="Lihat semua"
          onAction={() => onNavigate("transaksi")}
        />
        <TransactionList items={recent} />
      </section>
    </>
  );
}

function PanelTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button onClick={onAction}>
          {action}
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
function TxIcon({ category }: { category: string }) {
  return category === "Penghasilan" ? (
    <Landmark />
  ) : category === "Tagihan" ? (
    <ReceiptText />
  ) : category === "Makanan" ? (
    <CircleDollarSign />
  ) : (
    <WalletCards />
  );
}
function TransactionList({
  items,
  onEdit,
  onRemove,
}: {
  items: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onRemove?: (id: string) => void;
}) {
  if (!items.length)
    return (
      <div className="empty-state">
        <ReceiptText />
        <strong>Belum ada transaksi</strong>
        <p>Catat transaksi pertama Anda untuk melihat laporan.</p>
      </div>
    );
  return (
    <div className="transaction-list">
      {items.map((tx) => (
        <div className="transaction-row" key={tx.id}>
          <span className={`category-icon ${tx.type}`}>
            <TxIcon category={tx.category} />
          </span>
          <span className="transaction-name">
            <strong>
              {tx.title} {tx.splitGroupId && <Layers3 size={13} />}
            </strong>
            <small>
              {tx.category} ·{" "}
              {new Date(`${tx.date}T00:00:00`).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
              })}
            </small>
            {tx.note && <small className="tx-note">{tx.note}</small>}
          </span>
          {tx.receipt && (
            <a
              className="receipt-link"
              href={tx.receipt}
              target="_blank"
              rel="noreferrer"
              aria-label="Lihat foto struk"
            >
              <Camera size={16} />
            </a>
          )}
          <strong
            className={tx.type === "income" ? "amount income-text" : "amount"}
          >
            {tx.type === "income" ? "+" : "−"}
            {formatMoney(tx.amount)}
          </strong>
          {onEdit && (
            <button
              className="remove-button"
              onClick={() => onEdit(tx)}
              aria-label={`Edit ${tx.title}`}
            >
              <Pencil size={16} />
            </button>
          )}
          {onRemove && (
            <button
              className="remove-button"
              onClick={() => onRemove(tx.id)}
              aria-label={`Hapus ${tx.title}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
type TransactionFiltersProps = {
  data: AppData;
  items: Transaction[];
  query: string;
  setQuery: (v: string) => void;
  filter: "all" | TxType;
  setFilter: (v: "all" | TxType) => void;
  walletFilter: string;
  setWalletFilter: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  dateStart: string;
  setDateStart: (v: string) => void;
  dateEnd: string;
  setDateEnd: (v: string) => void;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onRemove: (id: string) => void;
};
function Transactions({
  data,
  items,
  query,
  setQuery,
  filter,
  setFilter,
  walletFilter,
  setWalletFilter,
  categoryFilter,
  setCategoryFilter,
  dateStart,
  setDateStart,
  dateEnd,
  setDateEnd,
  onAdd,
  onEdit,
  onRemove,
}: TransactionFiltersProps) {
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const categories = [
    ...new Set(data.transactions.map((t) => t.category)),
  ].sort();
  const resetFilters = () => {
    setQuery("");
    setFilter("all");
    setWalletFilter("all");
    setCategoryFilter("all");
    setDateStart("");
    setDateEnd("");
  };
  const requestDelete = (id: string) =>
    setTransactionToDelete(
      data.transactions.find((transaction) => transaction.id === id) || null,
    );
  return (
    <>
      <section className="panel page-panel">
        <div className="page-panel-head">
          <div>
            <h2>Riwayat transaksi</h2>
            <p>Cari dan saring berdasarkan dompet, kategori, atau tanggal.</p>
          </div>
          <Button onClick={onAdd}>
            <Plus size={17} />
            Tambah
          </Button>
        </div>
        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari transaksi, kategori, atau catatan…"
            />
          </div>
          <div className="filter-tabs">
            {(["all", "income", "expense"] as const).map((v) => (
              <button
                key={v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {v === "all"
                  ? "Semua"
                  : v === "income"
                    ? "Pemasukan"
                    : "Pengeluaran"}
              </button>
            ))}
          </div>
        </div>
        <div className="advanced-filters">
          <Select value={walletFilter} onValueChange={setWalletFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua dompet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua dompet</SelectItem>
              {data.wallets.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            aria-label="Tanggal mulai"
          />
          <Input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            aria-label="Tanggal akhir"
          />
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
        <div className="desktop-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaksi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <strong>{tx.title}</strong>
                    {tx.note && <small className="table-note">{tx.note}</small>}
                  </TableCell>
                  <TableCell>
                    {new Date(`${tx.date}T00:00:00`).toLocaleDateString(
                      "id-ID",
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="soft-badge">{tx.category}</span>
                    {tx.splitGroupId && (
                      <Layers3 className="inline-icon" size={14} />
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${tx.type === "income" ? "income-text" : ""}`}
                  >
                    {tx.type === "income" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="row-actions">
                      {tx.receipt && (
                        <a
                          className="receipt-link"
                          href={tx.receipt}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Camera size={16} />
                        </a>
                      )}
                      <button
                        className="remove-button"
                        onClick={() => onEdit(tx)}
                        aria-label={`Edit ${tx.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="remove-button"
                        onClick={() => setTransactionToDelete(tx)}
                        aria-label={`Hapus ${tx.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mobile-list">
          <TransactionList
            items={items}
            onEdit={onEdit}
            onRemove={requestDelete}
          />
        </div>
      </section>
      <AlertDialog
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus transaksi {transactionToDelete?.title}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saldo dompet dan pemakaian anggaran akan dikembalikan secara
              otomatis. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (transactionToDelete) onRemove(transactionToDelete.id);
                setTransactionToDelete(null);
              }}
            >
              Hapus transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="panel metric-card">
      <span className={`metric-icon ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function Budgets({
  items,
  onAdd,
  onUpdate,
  onRemove,
  language,
}: {
  items: Budget[];
  onAdd: () => void;
  onUpdate: (budget: Budget) => void;
  onRemove: (id: string) => void;
  language: "id" | "en";
}) {
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const english = language === "en";
  const spent = items.reduce((s, b) => s + b.spent, 0),
    limit = items.reduce((s, b) => s + b.limit, 0);
  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!budgetToEdit) return;
    const form = new FormData(event.currentTarget);
    onUpdate({
      ...budgetToEdit,
      category: String(form.get("category")),
      limit: Number(form.get("limit")),
      spent: Number(form.get("spent")),
    });
    setBudgetToEdit(null);
  };
  return (
    <>
      <div className="metric-grid">
        <MetricCard
          icon={<WalletCards />}
          label={english ? "Total budget" : "Total anggaran"}
          value={formatMoney(limit)}
          tone="purple"
        />
        <MetricCard
          icon={<ArrowUpRight />}
          label={english ? "Already spent" : "Sudah terpakai"}
          value={formatMoney(spent)}
          tone="orange"
        />
        <MetricCard
          icon={<ShieldCheck />}
          label={english ? "Remaining" : "Sisa tersedia"}
          value={formatMoney(Math.max(0, limit - spent))}
          tone="green"
        />
      </div>
      <section className="panel page-panel">
        <div className="page-panel-head">
          <div>
            <h2>{english ? "Budget by category" : "Anggaran per kategori"}</h2>
            <p>
              {english
                ? "Keep spending aligned with your plan."
                : "Jaga pengeluaran tetap sesuai rencana."}
            </p>
          </div>
          <Button onClick={onAdd}>
            <Plus size={17} />
            {english ? "Create budget" : "Buat anggaran"}
          </Button>
        </div>
        <div className="budget-cards">
          {items.map((b) => {
            const percent = Math.round((b.spent / b.limit) * 100);
            return (
              <article key={b.id}>
                <div className="budget-card-top">
                  <span
                    className="quick-icon"
                    style={{ background: `${b.color}18`, color: b.color }}
                  >
                    <WalletCards />
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="card-menu-trigger"
                        aria-label={`${english ? "Open budget menu" : "Buka menu anggaran"} ${b.category}`}
                      >
                        <MoreHorizontal />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setBudgetToEdit(b)}>
                        <Pencil />
                        {english ? "Edit budget" : "Edit anggaran"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setBudgetToDelete(b)}
                      >
                        <Trash2 />
                        {english ? "Delete budget" : "Hapus anggaran"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3>{b.category}</h3>
                <div className="budget-numbers">
                  <strong>{formatMoney(b.spent)}</strong>
                  <span>
                    {english ? "of" : "dari"} {formatMoney(b.limit)}
                  </span>
                </div>
                <Progress value={Math.min(100, percent)} />
                <p className={percent > 85 ? "warning-text" : ""}>
                  {percent > 85
                    ? english
                      ? "Near the limit"
                      : "Mendekati batas"
                    : `${100 - percent}% ${english ? "available" : "masih tersedia"}`}
                </p>
              </article>
            );
          })}
          {!items.length && (
            <div className="empty-state">
              <WalletCards />
              <strong>
                {english ? "No budgets yet" : "Belum ada anggaran"}
              </strong>
              <p>
                {english
                  ? "Set a limit to keep spending under control."
                  : "Buat batas agar pengeluaran lebih terkendali."}
              </p>
            </div>
          )}
        </div>
      </section>
      <Dialog
        open={!!budgetToEdit}
        onOpenChange={(open) => !open && setBudgetToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {english ? "Edit budget" : "Edit anggaran"}
            </DialogTitle>
          </DialogHeader>
          {budgetToEdit && (
            <form
              key={budgetToEdit.id}
              className="entry-form"
              onSubmit={submitEdit}
            >
              <div>
                <Label>{english ? "Category" : "Kategori"}</Label>
                <Input
                  name="category"
                  required
                  defaultValue={budgetToEdit.category}
                />
              </div>
              <div>
                <Label>{english ? "Budget limit" : "Batas anggaran"}</Label>
                <Input
                  name="limit"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={budgetToEdit.limit}
                />
              </div>
              <div>
                <Label>{english ? "Amount spent" : "Sudah terpakai"}</Label>
                <Input
                  name="spent"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={budgetToEdit.spent}
                />
              </div>
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBudgetToEdit(null)}
                >
                  {english ? "Cancel" : "Batal"}
                </Button>
                <Button type="submit">
                  {english ? "Save changes" : "Simpan perubahan"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!budgetToDelete}
        onOpenChange={(v) => !v && setBudgetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {english
                ? `Delete ${budgetToDelete?.category} budget?`
                : `Hapus anggaran ${budgetToDelete?.category}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {english
                ? "The budget limit and progress will be deleted. Existing transactions remain available."
                : "Batas dan progres anggaran ini akan dihapus. Transaksi yang sudah dicatat tetap tersimpan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {english ? "Cancel" : "Batal"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (budgetToDelete) onRemove(budgetToDelete.id);
                setBudgetToDelete(null);
              }}
            >
              {english ? "Delete budget" : "Hapus anggaran"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function Goals({
  items,
  onAdd,
  setData,
  onUpdate,
  onRemove,
  language,
}: {
  items: Goal[];
  onAdd: () => void;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  onUpdate: (goal: Goal) => void;
  onRemove: (id: string) => void;
  language: "id" | "en";
}) {
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
  const english = language === "en";
  const addSaving = (id: string) =>
    setData((d) => ({
      ...d,
      goals: d.goals.map((g) =>
        g.id === id ? { ...g, saved: Math.min(g.target, g.saved + 500000) } : g,
      ),
    }));
  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goalToEdit) return;
    const form = new FormData(event.currentTarget);
    onUpdate({
      ...goalToEdit,
      title: String(form.get("title")),
      target: Number(form.get("target")),
      saved: Number(form.get("saved")),
      deadline: String(form.get("deadline")),
    });
    setGoalToEdit(null);
  };
  return (
    <>
      <section className="panel page-panel">
        <div className="page-panel-head">
          <div>
            <h2>{english ? "Your financial goals" : "Tujuan keuangan Anda"}</h2>
            <p>
              {english
                ? "Turn big plans into measurable steps."
                : "Ubah rencana besar menjadi langkah kecil yang terukur."}
            </p>
          </div>
          <Button onClick={onAdd}>
            <Plus size={17} />
            {english ? "Add goal" : "Tambah tujuan"}
          </Button>
        </div>
        <div className="goal-grid">
          {items.map((g) => {
            const percent = Math.round((g.saved / g.target) * 100);
            return (
              <article className="goal-card" key={g.id}>
                <div className="goal-card-top">
                  <div className="goal-flag">
                    <Flag />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="card-menu-trigger"
                        aria-label={`${english ? "Open goal menu" : "Buka menu tujuan"} ${g.title}`}
                      >
                        <MoreHorizontal />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setGoalToEdit(g)}>
                        <Pencil />
                        {english ? "Edit goal" : "Edit tujuan"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setGoalToDelete(g)}
                      >
                        <Trash2 />
                        {english ? "Delete goal" : "Hapus tujuan"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="goal-title">
                  <div>
                    <h3>{g.title}</h3>
                    <p>
                      {english ? "Target" : "Target"}{" "}
                      {new Date(`${g.deadline}T00:00:00`).toLocaleDateString(
                        english ? "en-US" : "id-ID",
                        { month: "long", year: "numeric" },
                      )}
                    </p>
                  </div>
                  <strong>{percent}%</strong>
                </div>
                <Progress value={percent} />
                <div className="goal-values">
                  <span>
                    <small>{english ? "Saved" : "Terkumpul"}</small>
                    <strong>{formatMoney(g.saved)}</strong>
                  </span>
                  <span>
                    <small>{english ? "Target" : "Target"}</small>
                    <strong>{formatMoney(g.target)}</strong>
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    addSaving(g.id);
                    toast.success(
                      english
                        ? "Savings increased by Rp500,000"
                        : "Tabungan ditambah Rp500.000",
                    );
                  }}
                >
                  {english ? "Add Rp500,000" : "Tambah Rp500.000"}
                </Button>
              </article>
            );
          })}
          {!items.length && (
            <div className="empty-state">
              <Target />
              <strong>{english ? "No goals yet" : "Belum ada tujuan"}</strong>
              <p>
                {english
                  ? "Start with an emergency fund, vacation, or important purchase."
                  : "Mulai dari dana darurat, liburan, atau pembelian penting."}
              </p>
            </div>
          )}
        </div>
      </section>
      <Dialog
        open={!!goalToEdit}
        onOpenChange={(open) => !open && setGoalToEdit(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{english ? "Edit goal" : "Edit tujuan"}</DialogTitle>
          </DialogHeader>
          {goalToEdit && (
            <form
              key={goalToEdit.id}
              className="entry-form"
              onSubmit={submitEdit}
            >
              <div>
                <Label>{english ? "Goal name" : "Nama tujuan"}</Label>
                <Input name="title" required defaultValue={goalToEdit.title} />
              </div>
              <div className="two-col">
                <div>
                  <Label>{english ? "Target amount" : "Target dana"}</Label>
                  <Input
                    name="target"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue={goalToEdit.target}
                  />
                </div>
                <div>
                  <Label>{english ? "Amount saved" : "Dana terkumpul"}</Label>
                  <Input
                    name="saved"
                    type="number"
                    min="0"
                    step="1"
                    required
                    defaultValue={goalToEdit.saved}
                  />
                </div>
              </div>
              <div>
                <Label>{english ? "Target date" : "Tanggal target"}</Label>
                <Input
                  name="deadline"
                  type="date"
                  required
                  defaultValue={goalToEdit.deadline}
                />
              </div>
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoalToEdit(null)}
                >
                  {english ? "Cancel" : "Batal"}
                </Button>
                <Button type="submit">
                  {english ? "Save changes" : "Simpan perubahan"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!goalToDelete}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {english
                ? `Delete goal ${goalToDelete?.title}?`
                : `Hapus tujuan ${goalToDelete?.title}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {english
                ? "The target and saved progress will be deleted. Existing transactions remain available."
                : "Target dan progres tabungan tujuan ini akan dihapus. Transaksi yang sudah dicatat tetap tersimpan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {english ? "Cancel" : "Batal"}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (goalToDelete) onRemove(goalToDelete.id);
                setGoalToDelete(null);
              }}
            >
              {english ? "Delete goal" : "Hapus tujuan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function Reports({
  totals,
  data,
  onCsv,
  onPdf,
}: {
  totals: Totals;
  data: AppData;
  onCsv: () => void;
  onPdf: () => void;
}) {
  const expenseByCategory = Object.entries(
    data.transactions
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>(
        (a, t) => ({ ...a, [t.category]: (a[t.category] || 0) + t.amount }),
        {},
      ),
  ).sort((a, b) => b[1] - a[1]);
  const max = expenseByCategory[0]?.[1] || 1;
  const monthKey = today.slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const previousKey = new Date(year, month - 2, 1).toISOString().slice(0, 7);
  const previousExpense = data.transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(previousKey))
    .reduce((s, t) => s + t.amount, 0);
  const expenseChange = previousExpense
    ? Math.round(((totals.expense - previousExpense) / previousExpense) * 100)
    : null;
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 1 - (5 - index), 1);
    const key = date.toISOString().slice(0, 7);
    const tx = data.transactions.filter((t) => t.date.startsWith(key));
    return {
      month: date.toLocaleDateString("id-ID", { month: "short" }),
      masuk:
        tx
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0) / 1_000_000,
      keluar:
        tx
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0) / 1_000_000,
    };
  });
  return (
    <>
      <div className="report-banner">
        <div>
          <p>
            Ringkasan{" "}
            {new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("id-ID", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <h2>Anda menyimpan {totals.savingsRate}% dari pemasukan</h2>
          <span>
            {expenseChange === null
              ? "Tambahkan data bulan lalu untuk melihat perbandingan."
              : `Pengeluaran ${Math.abs(expenseChange)}% ${expenseChange > 0 ? "lebih tinggi" : "lebih rendah"} dari bulan lalu.`}
          </span>
        </div>
        <div className="report-actions">
          <Button onClick={onPdf}>
            <FileJson size={17} />
            Unduh PDF
          </Button>
          <Button variant="outline" onClick={onCsv}>
            <Download size={17} />
            CSV
          </Button>
        </div>
      </div>
      <div className="comparison-grid">
        <MetricCard
          icon={<ArrowUpRight />}
          label="Pengeluaran bulan ini"
          value={formatMoney(totals.expense)}
          tone="orange"
        />
        <MetricCard
          icon={<CalendarDays />}
          label="Pengeluaran bulan lalu"
          value={formatMoney(previousExpense)}
          tone="purple"
        />
        <MetricCard
          icon={<TrendingUp />}
          label="Perubahan"
          value={
            expenseChange === null
              ? "Belum tersedia"
              : `${expenseChange > 0 ? "+" : ""}${expenseChange}%`
          }
          tone={
            expenseChange !== null && expenseChange > 0 ? "orange" : "green"
          }
        />
      </div>
      <div className="report-grid">
        <section className="panel">
          <PanelTitle
            title="Tren arus kas"
            subtitle="Pemasukan vs pengeluaran 6 bulan"
          />
          <div className="chart-wrap report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${v} juta`, ""]} />
                <Area
                  type="monotone"
                  dataKey="masuk"
                  stroke="var(--brand)"
                  fill="var(--brand-soft)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="keluar"
                  stroke="#f08b70"
                  fill="#f08b7010"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <PanelTitle
            title="Pengeluaran terbesar"
            subtitle="Berdasarkan kategori"
          />
          <div className="category-bars">
            {expenseByCategory.map(([name, value], i) => (
              <div key={name}>
                <div>
                  <span>{name}</span>
                  <strong>{formatMoney(value)}</strong>
                </div>
                <span className="bar-track">
                  <i
                    style={{
                      width: `${(value / max) * 100}%`,
                      background: [
                        "var(--brand)",
                        "#13b981",
                        "#f59e0b",
                        "#ef6d71",
                      ][i % 4],
                    }}
                  />
                </span>
              </div>
            ))}
            {!expenseByCategory.length && <p>Belum ada data pengeluaran.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
function Preferences({
  dark,
  setDark,
  displayPrefs,
  updateDisplayPrefs,
  exportJson,
  importRef,
  importData,
  reset,
  security,
  accountEmail,
  syncState,
  syncNow,
  connectAccount,
  disconnectAccount,
  deleteAccount,
  deletingAccount,
}: {
  dark: boolean;
  setDark: (v: boolean) => void;
  displayPrefs: DisplayPreferences;
  updateDisplayPrefs: (v: DisplayPreferences) => void;
  exportJson: () => void;
  importRef: React.RefObject<HTMLInputElement | null>;
  importData: (f?: File) => void;
  reset: () => void;
  security: ReturnType<typeof useAppSecurity>;
  accountEmail: string | null;
  syncState: SyncState;
  syncNow: () => void;
  connectAccount: () => void;
  disconnectAccount: () => void;
  deleteAccount: () => void;
  deletingAccount: boolean;
}) {
  const themes = [
    { id: "violet", label: "Ungu", color: "#6758ef" },
    { id: "ocean", label: "Laut", color: "#137fbd" },
    { id: "emerald", label: "Hijau", color: "#15976d" },
    { id: "sunset", label: "Senja", color: "#e56745" },
  ] as const;
  const syncLabels: Record<SyncStatus, string> = {
    offline: "Tidak aktif",
    loading: "Memulihkan data",
    syncing: "Menyinkronkan",
    synced: "Sinkronisasi berhasil",
    error: "Sinkronisasi gagal",
  };
  const lastSync = syncState.lastSyncedAt
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(syncState.lastSyncedAt))
    : "Belum pernah disinkronkan";
  return (
    <div className="settings-grid">
      <SecuritySettings security={security} />
      <section className="panel settings-card">
        <PanelTitle
          title="Pengaturan akun"
          subtitle={accountEmail || "Belum terhubung ke akun Google"}
        />
        {accountEmail && (
          <div className={`sync-settings ${syncState.status}`}>
            <span className="setting-icon">
              {syncState.status === "synced" ? (
                <CheckCircle2 />
              ) : syncState.status === "error" ? (
                <CloudOff />
              ) : (
                <CloudUpload />
              )}
            </span>
            <span>
              <strong>{syncLabels[syncState.status]}</strong>
              <small>
                {syncState.message || `Terakhir disinkronkan: ${lastSync}`}
              </small>
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={syncNow}
              disabled={
                syncState.status === "loading" || syncState.status === "syncing"
              }
            >
              <RefreshCw />
              Coba lagi
            </Button>
          </div>
        )}
        {accountEmail ? (
          <button
            className="setting-row"
            type="button"
            onClick={disconnectAccount}
          >
            <span className="setting-icon">
              <LogOut />
            </span>
            <span>
              <strong>Logout</strong>
              <small>Keluar dari akun tanpa menghapus data lokal</small>
            </span>
            <ChevronRight />
          </button>
        ) : (
          <button
            className="setting-row"
            type="button"
            onClick={connectAccount}
          >
            <span className="setting-icon">
              <Cloud />
            </span>
            <span>
              <strong>Masuk dengan Google</strong>
              <small>Hubungkan akun FinanceTrack Anda</small>
            </span>
            <ChevronRight />
          </button>
        )}
      </section>
      <section className="panel settings-card">
        <PanelTitle
          title="Tampilan"
          subtitle="Sesuaikan kenyamanan penggunaan"
        />
        <button className="setting-row" onClick={() => setDark(!dark)}>
          <span className="setting-icon">{dark ? <Moon /> : <Sun />}</span>
          <span>
            <strong>Mode gelap</strong>
            <small>Nyaman digunakan di malam hari</small>
          </span>
          <span className={`fake-switch ${dark ? "on" : ""}`}>
            <i />
          </span>
        </button>
        <div className="preference-field">
          <Label>Mata uang</Label>
          <Select
            value={displayPrefs.currency}
            onValueChange={(currency) =>
              updateDisplayPrefs({
                ...displayPrefs,
                currency: currency as DisplayPreferences["currency"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">Rupiah (IDR)</SelectItem>
              <SelectItem value="USD">Dolar AS (USD)</SelectItem>
              <SelectItem value="EUR">Euro (EUR)</SelectItem>
              <SelectItem value="SGD">Dolar Singapura (SGD)</SelectItem>
              <SelectItem value="MYR">Ringgit (MYR)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="preference-field">
          <Label>Tema warna</Label>
          <div className="theme-choices">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={displayPrefs.themeColor === theme.id ? "active" : ""}
                onClick={() =>
                  updateDisplayPrefs({ ...displayPrefs, themeColor: theme.id })
                }
              >
                <i style={{ background: theme.color }} />
                {theme.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="panel settings-card">
        <PanelTitle
          title="Data & cadangan"
          subtitle="Simpan salinan data Anda secara berkala"
        />
        <button className="setting-row" onClick={exportJson}>
          <span className="setting-icon">
            <FileJson />
          </span>
          <span>
            <strong>Ekspor cadangan</strong>
            <small>Unduh seluruh data dalam format JSON</small>
          </span>
          <Download />
        </button>
        <button
          className="setting-row"
          onClick={() => importRef.current?.click()}
        >
          <span className="setting-icon">
            <Upload />
          </span>
          <span>
            <strong>Pulihkan cadangan</strong>
            <small>Impor data dari file FinanceTrack</small>
          </span>
          <ChevronRight />
        </button>
        <input
          className="hidden"
          ref={importRef}
          type="file"
          accept="application/json"
          onChange={(e) => importData(e.target.files?.[0])}
        />
        <a className="setting-row" href="/privacy">
          <span className="setting-icon">
            <ShieldCheck />
          </span>
          <span>
            <strong>Kebijakan privasi</strong>
            <small>Cara FinanceTrack melindungi data Anda</small>
          </span>
          <ChevronRight />
        </a>
        <a className="setting-row" href="/terms">
          <span className="setting-icon">
            <FileJson />
          </span>
          <span>
            <strong>Ketentuan penggunaan</strong>
            <small>Aturan penggunaan FinanceTrack</small>
          </span>
          <ChevronRight />
        </a>
        <a className="setting-row" href="/support">
          <span className="setting-icon">
            <Bell />
          </span>
          <span>
            <strong>Bantuan dan dukungan</strong>
            <small>Hubungi pengembang atau baca bantuan</small>
          </span>
          <ChevronRight />
        </a>
      </section>
      <section className="panel settings-card danger-zone">
        <PanelTitle
          title="Zona berbahaya"
          subtitle="Tindakan ini tidak dapat dibatalkan"
        />
        <button
          className="setting-row danger"
          onClick={() => {
            if (
              confirm(
                "Hapus seluruh transaksi, anggaran, dan tujuan dari perangkat ini?",
              )
            )
              reset();
          }}
        >
          <span className="setting-icon">
            <Trash2 />
          </span>
          <span>
            <strong>Hapus data perangkat</strong>
            <small>Mengosongkan data lokal tanpa menghapus akun</small>
          </span>
          <ChevronRight />
        </button>
        <button className="setting-row danger" onClick={deleteAccount} disabled={deletingAccount}>
          <span className="setting-icon">
            <Trash2 />
          </span>
          <span>
            <strong>{deletingAccount ? "Menghapus seluruh data…" : "Hapus akun dan data"}</strong>
            <small>
              {deletingAccount
                ? "Jangan tutup aplikasi sampai proses selesai"
                : accountEmail
                ? "Menghapus akun Google FinanceTrack dan data terkait"
                : "Masuk dengan Google terlebih dahulu"}
            </small>
          </span>
          <ChevronRight />
        </button>
        <a className="setting-row" href="/delete-account">
          <span className="setting-icon">
            <ShieldCheck />
          </span>
          <span>
            <strong>Informasi penghapusan akun</strong>
            <small>Proses dan data yang akan dihapus</small>
          </span>
          <ChevronRight />
        </a>
      </section>
      <section className="panel about-card">
        <Logo />
        <p>Versi 1.6.0 · PWA + Android</p>
        <span>
          <ShieldCheck /> Offline untuk Gratis, akun Google opsional
        </span>
      </section>
    </div>
  );
}

async function compressReceipt(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const next = new Image();
    next.onload = () => resolve(next);
    next.onerror = reject;
    next.src = source;
  });
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

function EntryDialog({
  kind,
  editingTransaction,
  close,
  setData,
  data,
  onUpdate,
}: {
  kind: ModalKind;
  editingTransaction: Transaction | null;
  close: () => void;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  data: AppData;
  onUpdate: (transaction: Transaction) => void;
}) {
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [receipt, setReceipt] = useState(editingTransaction?.receipt || "");
  const closeDialog = () => {
    setSplitEnabled(false);
    setReceipt("");
    close();
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    if (kind === "transaction") {
      let storedReceipt = receipt;
      if (receipt.startsWith("data:image/")) {
        try {
          storedReceipt = await uploadReceiptImage(
            receipt,
            editingTransaction?.id || id,
          );
        } catch {
          toast.error("Foto struk gagal disimpan ke Firebase Storage");
          return;
        }
      }
      const amount = Number(f.get("amount")),
        splitAmount = Number(f.get("splitAmount") || 0),
        groupId = splitEnabled ? crypto.randomUUID() : undefined;
      const base = {
        title: String(f.get("title")),
        type: String(f.get("type")) as TxType,
        date: String(f.get("date")),
        walletId: String(f.get("walletId")),
        note: String(f.get("note") || ""),
      };
      if (editingTransaction) {
        onUpdate({
          ...editingTransaction,
          ...base,
          category: String(f.get("category")),
          amount,
          receipt: storedReceipt,
        });
        closeDialog();
        return;
      }
      const transactions: Transaction[] =
        splitEnabled && splitAmount > 0 && splitAmount < amount
          ? [
              {
                id,
                ...base,
                category: String(f.get("category")),
                amount: amount - splitAmount,
                receipt: storedReceipt,
                splitGroupId: groupId,
              },
              {
                id: crypto.randomUUID(),
                ...base,
                title: `${base.title} (bagian 2)`,
                category: String(f.get("splitCategory")),
                amount: splitAmount,
                splitGroupId: groupId,
              },
            ]
          : [
              {
                id,
                ...base,
                category: String(f.get("category")),
                amount,
                receipt: storedReceipt,
              },
            ];
      setData((d) => ({
        ...d,
        transactions: [...transactions, ...d.transactions],
        wallets: d.wallets.map((w) =>
          w.id === base.walletId
            ? {
                ...w,
                balance:
                  w.balance + (base.type === "income" ? amount : -amount),
              }
            : w,
        ),
        budgets:
          base.type === "expense"
            ? d.budgets.map((b) => ({
                ...b,
                spent:
                  b.spent +
                  transactions
                    .filter((tx) => tx.category === b.category)
                    .reduce((sum, tx) => sum + tx.amount, 0),
              }))
            : d.budgets,
      }));
      toast.success(
        transactions.length === 2
          ? "Transaksi berhasil dibagi ke 2 kategori"
          : "Transaksi berhasil dicatat",
      );
    }
    if (kind === "budget") {
      const b: Budget = {
        id,
        category: String(f.get("category")),
        limit: Number(f.get("amount")),
        spent: 0,
        color: "#6d5dfc",
      };
      setData((d) => ({ ...d, budgets: [...d.budgets, b] }));
      toast.success("Anggaran berhasil dibuat");
    }
    if (kind === "goal") {
      const g: Goal = {
        id,
        title: String(f.get("title")),
        target: Number(f.get("amount")),
        saved: Number(f.get("saved") || 0),
        deadline: String(f.get("date")),
      };
      setData((d) => ({ ...d, goals: [...d.goals, g] }));
      toast.success("Tujuan baru ditambahkan");
    }
    closeDialog();
  }
  const titles = {
    transaction: editingTransaction ? "Edit transaksi" : "Catat transaksi",
    budget: "Buat anggaran",
    goal: "Tambah tujuan",
  };
  const categories = [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Kesehatan",
    "Hiburan",
    "Penghasilan",
    "Lainnya",
  ];
  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && closeDialog()}>
      <DialogContent className="entry-dialog">
        <DialogHeader>
          <DialogTitle>{kind ? titles[kind] : ""}</DialogTitle>
        </DialogHeader>
        {kind && (
          <form
            key={editingTransaction?.id || kind}
            onSubmit={submit}
            className="entry-form"
          >
            {kind !== "budget" && (
              <div>
                <Label htmlFor="title">
                  {kind === "goal" ? "Nama tujuan" : "Nama transaksi"}
                </Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={editingTransaction?.title}
                  placeholder={
                    kind === "goal"
                      ? "Contoh: Dana darurat"
                      : "Contoh: Belanja mingguan"
                  }
                />
              </div>
            )}
            {kind === "transaction" && (
              <>
                <div className="two-col">
                  <div>
                    <Label>Jenis</Label>
                    <Select
                      name="type"
                      defaultValue={editingTransaction?.type || "expense"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Pengeluaran</SelectItem>
                        <SelectItem value="income">Pemasukan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <Select
                      name="category"
                      defaultValue={editingTransaction?.category || "Makanan"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((x) => (
                          <SelectItem key={x} value={x}>
                            {x}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Dompet</Label>
                  <Select
                    name="walletId"
                    defaultValue={
                      editingTransaction?.walletId || data.wallets[0]?.id
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {data.wallets.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} · {formatMoney(w.balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {kind === "budget" && (
              <div>
                <Label>Kategori anggaran</Label>
                <Select name="category" defaultValue="Makanan">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((x) => x !== "Penghasilan")
                      .map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="amount">
                {kind === "goal" ? "Target dana" : "Jumlah"}
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                defaultValue={editingTransaction?.amount}
                placeholder="0"
              />
            </div>
            {kind === "goal" && (
              <div>
                <Label htmlFor="saved">Dana awal (opsional)</Label>
                <Input
                  id="saved"
                  name="saved"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </div>
            )}
            {kind === "transaction" && (
              <>
                <div>
                  <Label htmlFor="note">Catatan (opsional)</Label>
                  <Input
                    id="note"
                    name="note"
                    defaultValue={editingTransaction?.note}
                    placeholder="Contoh: kebutuhan dapur minggu ini"
                  />
                </div>
                {!editingTransaction && (
                  <>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={splitEnabled}
                        onChange={(e) => setSplitEnabled(e.target.checked)}
                      />
                      <Layers3 size={17} />
                      <span>Bagi transaksi ke dua kategori</span>
                    </label>
                    {splitEnabled && (
                      <div className="two-col split-fields">
                        <div>
                          <Label>Kategori kedua</Label>
                          <Select name="splitCategory" defaultValue="Lainnya">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((x) => (
                                <SelectItem key={x} value={x}>
                                  {x}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Jumlah kategori kedua</Label>
                          <Input
                            name="splitAmount"
                            type="number"
                            min="1"
                            step="1"
                            required
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <Label>Foto struk (opsional)</Label>
                  <label className="receipt-picker">
                    <Camera size={19} />
                    <span>
                      {receipt
                        ? "Foto struk siap disimpan"
                        : "Ambil atau pilih foto struk"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setReceipt(await compressReceipt(file));
                          toast.success("Foto struk ditambahkan");
                        } catch {
                          toast.error("Foto struk tidak dapat dibaca");
                        }
                      }}
                    />
                  </label>
                </div>
              </>
            )}
            {kind !== "budget" && (
              <div>
                <Label htmlFor="date">
                  {kind === "goal" ? "Target tercapai" : "Tanggal"}
                </Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={editingTransaction?.date || today}
                />
              </div>
            )}
            <div className="dialog-actions">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Batal
              </Button>
              <Button type="submit">
                {editingTransaction ? "Simpan perubahan" : "Simpan"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
