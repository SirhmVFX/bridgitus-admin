"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { getAllStudents, type Student } from "@/lib/firestore";
import { Timestamp } from "firebase/firestore";
import {
  MdPayment, MdSearch, MdCheckCircle, MdCancel, MdClose,
  MdAutorenew, MdCreditCard, MdWarning, MdRefresh,
} from "react-icons/md";

const CURRENCY = (process.env.NEXT_PUBLIC_PAYMENT_CURRENCY || "AUD").toUpperCase();

function formatAmount(cents?: number): string {
  if (!cents) return "—";
  const major = cents / 100;
  try {
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: CURRENCY, minimumFractionDigits: 2 }).format(major);
  } catch {
    return `${CURRENCY} ${major.toLocaleString()}`;
  }
}

function formatDate(ts?: unknown): string {
  if (!ts) return "—";
  const d = ts instanceof Timestamp ? ts.toDate()
    : typeof (ts as { toDate?: () => Date })?.toDate === "function" ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_BADGE: Record<string, string> = {
  paid: "badge-green",
  waived: "badge-blue",
  pending: "badge-yellow",
  failed: "badge-red",
  expired: "badge-red",
};

export default function PaymentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Auto-pay setup modal
  const [setupFor, setSetupFor] = useState<Student | null>(null);
  const [interval, setIntervalValue] = useState<"weekly" | "monthly">("weekly");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingFor, setCancellingFor] = useState<string | null>(null);

  async function load() {
    try {
      setStudents(await getAllStudents());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openSetup(s: Student) {
    setSetupFor(s);
    setIntervalValue("weekly");
    setAmount(s.paymentAmount ? String(s.paymentAmount / 100) : "");
    setMessage(null);
  }

  async function handleCreateAutoPay() {
    if (!setupFor?.id) return;
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setMessage({ type: "error", text: "Enter a valid amount." });
      return;
    }
    setSubmitting(true); setMessage(null);
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", studentId: setupFor.id, interval, amountCents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set up auto-pay");
      setMessage({
        type: "ok",
        text: `${data.message}${data.nextPaymentDate ? ` Next payment: ${formatDate(data.nextPaymentDate)}.` : ""}`,
      });
      setSetupFor(null);
      await load();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to set up auto-pay" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelAutoPay(s: Student) {
    if (!s.id) return;
    if (!confirm(`Cancel the ${s.autoPay?.interval} auto-pay for ${s.firstName} ${s.lastName}?`)) return;
    setCancellingFor(s.id); setMessage(null);
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", studentId: s.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel auto-pay");
      setMessage({ type: "ok", text: `Auto-pay cancelled for ${s.firstName} ${s.lastName}.` });
      await load();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to cancel auto-pay" });
    } finally {
      setCancellingFor(null);
    }
  }

  const filtered = students.filter((s) => {
    const sMatch = !search || `${s.firstName} ${s.lastName} ${s.studentId} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    const stMatch = statusFilter === "all" || s.paymentStatus === statusFilter;
    return sMatch && stMatch;
  });

  const stats = {
    paid: students.filter(s => s.paymentStatus === "paid").length,
    pending: students.filter(s => s.paymentStatus === "pending").length,
    expired: students.filter(s => s.paymentStatus === "expired" || s.paymentStatus === "failed").length,
    autoPay: students.filter(s => s.autoPay?.status === "active").length,
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <MdPayment size={22} className="text-[#00369b]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-500 text-sm">
              View student payments and set up automatic weekly or monthly direct debits via Stripe (AUD)
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Paid Students", value: stats.paid, color: "bg-emerald-50 text-emerald-600" },
            { label: "Payment Pending", value: stats.pending, color: "bg-amber-50 text-amber-600" },
            { label: "Expired / Failed", value: stats.expired, color: "bg-red-50 text-red-600" },
            { label: "Active Auto-pay", value: stats.autoPay, color: "bg-blue-50 text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="admin-card flex items-center gap-3">
              <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${s.color}`}>
                <MdPayment size={18} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {message && (
          <div className={`border px-4 py-3 text-sm flex items-center gap-2 ${message.type === "ok"
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.type === "ok" ? <MdCheckCircle size={16} /> : <MdWarning size={16} />}
            {message.text}
          </div>
        )}

        {/* Filters */}
        <div className="admin-card flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <MdSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…" className="admin-input pl-8" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-input w-auto">
            <option value="all">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="waived">Waived</option>
            <option value="expired">Expired</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-1.5">
            <MdRefresh size={15} /> Refresh
          </button>
        </div>

        {/* Table */}
        <div className="admin-card p-0 overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-[#00369b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading payments…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <MdPayment size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No students found.</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead><tr>
                <th>Student</th><th>Plan</th><th>Status</th><th>Last Payment</th>
                <th>Expires</th><th>Card on File</th><th>Auto-pay</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((s) => {
                  const hasCard = !!s.stripePaymentMethod?.paymentMethodId || !!s.paystackAuthorization?.authorizationCode;
                  const cardLast4 = s.stripePaymentMethod?.last4 || s.paystackAuthorization?.last4;
                  const cardBrand = s.stripePaymentMethod?.brand || s.paystackAuthorization?.cardType;
                  const autoPayActive = s.autoPay?.status === "active";
                  const autoPayAmount = s.autoPay?.amountCents ?? s.autoPay?.amountKobo;
                  return (
                    <tr key={s.id}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-800">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.studentId}</p>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{s.planTitle ?? "—"}</td>
                      <td><span className={`badge ${STATUS_BADGE[s.paymentStatus] ?? "badge-gray"}`}>{s.paymentStatus}</span></td>
                      <td>
                        <p className="text-sm text-gray-700 font-semibold">{formatAmount(s.paymentAmount)}</p>
                        <p className="text-xs text-gray-400">{formatDate(s.paidAt)}</p>
                      </td>
                      <td className="text-sm text-gray-600">{formatDate(s.planExpiresAt)}</td>
                      <td>
                        {hasCard ? (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <MdCreditCard size={14} className="text-gray-400" />
                            {cardBrand?.trim() || "Card"} ····{cardLast4}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No saved card</span>
                        )}
                      </td>
                      <td>
                        {autoPayActive ? (
                          <span className="badge badge-green flex items-center gap-1 w-fit">
                            <MdAutorenew size={12} /> {s.autoPay!.interval} · {formatAmount(autoPayAmount)}
                          </span>
                        ) : s.autoPay?.status === "cancelled" ? (
                          <span className="badge badge-gray">cancelled</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td>
                        {autoPayActive ? (
                          <button onClick={() => handleCancelAutoPay(s)} disabled={cancellingFor === s.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50">
                            <MdCancel size={13} /> {cancellingFor === s.id ? "Cancelling…" : "Cancel auto-pay"}
                          </button>
                        ) : (
                          <button onClick={() => openSetup(s)} disabled={!s.stripePaymentMethod?.paymentMethodId}
                            title={s.stripePaymentMethod?.paymentMethodId ? "Set up automatic direct debit" : "Student must complete one Stripe payment first to save a card"}
                            className="text-xs font-semibold text-[#00369b] hover:underline flex items-center gap-1 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed">
                            <MdAutorenew size={13} /> Set up auto-pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Auto-pay uses the card saved when the student paid online through Stripe Checkout.
          Stripe automatically charges the card every week or month and retries failed charges.
          Students without a saved card must complete one online payment first.
        </p>
      </div>

      {/* Auto-pay setup modal */}
      {setupFor && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSetupFor(null)}>
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MdAutorenew size={18} className="text-[#00369b]" /> Set Up Automatic Payment
              </h2>
              <button onClick={() => setSetupFor(null)} className="text-gray-400 hover:text-gray-600"><MdClose size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-800">{setupFor.firstName} {setupFor.lastName}</p>
                <p className="text-xs text-gray-400 font-mono">{setupFor.studentId} · {setupFor.email}</p>
                {setupFor.stripePaymentMethod && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MdCreditCard size={13} />
                    {setupFor.stripePaymentMethod.brand?.trim() || "Card"} ending ····{setupFor.stripePaymentMethod.last4}
                  </p>
                )}
              </div>

              <div>
                <label className="admin-label">Billing Interval</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["weekly", "monthly"] as const).map((opt) => (
                    <button key={opt} onClick={() => setIntervalValue(opt)}
                      className={`py-2.5 text-sm font-semibold border-2 transition-colors capitalize ${interval === opt
                        ? "border-[#00369b] bg-[#00369b]/5 text-[#00369b]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="admin-label">Amount per {interval === "weekly" ? "week" : "month"} ({CURRENCY})</label>
                <input type="number" min="1" step="0.01" value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="admin-input" placeholder="e.g. 49.99" />
                {amount && !isNaN(parseFloat(amount)) && (
                  <p className="text-xs text-gray-400 mt-1">
                    The student's card will be charged {formatAmount(Math.round(parseFloat(amount) * 100))} every {interval === "weekly" ? "week" : "month"}.
                  </p>
                )}
              </div>

              {message?.type === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">{message.text}</p>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={handleCreateAutoPay} disabled={submitting}
                  className="btn-primary disabled:opacity-60 flex items-center gap-2">
                  {submitting
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up…</>
                    : <><MdAutorenew size={15} /> Start Auto-pay</>}
                </button>
                <button onClick={() => setSetupFor(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
