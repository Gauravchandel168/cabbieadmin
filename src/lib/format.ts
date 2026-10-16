import type { Lang } from "../i18n/lang";
import type { T } from "../i18n";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,25,000 */
export function money(v: number | null | undefined, empty = "—") {
  if (v == null || Number.isNaN(v)) return empty;
  return "₹" + (Math.round(v) === v ? inr.format(v) : inr2.format(v));
}

export function num(v: number | null | undefined) {
  return v == null ? "—" : inr.format(v);
}

const locale = (lang: Lang) => (lang === "hi" ? "hi-IN" : "en-IN");
const IST = "Asia/Kolkata";

function parse(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function date(v: string | null | undefined, lang: Lang) {
  const d = parse(v);
  if (!d) return "—";
  return d.toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: IST });
}

export function dateTime(v: string | null | undefined, lang: Lang) {
  const d = parse(v);
  if (!d) return "—";
  return d.toLocaleString(locale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: IST });
}

export function longDate(lang: Lang) {
  return new Date().toLocaleDateString(locale(lang), {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: IST,
  });
}

export function weekdayShort(isoDate: string, lang: Lang) {
  const d = parse(isoDate + "T00:00:00+05:30");
  return d ? d.toLocaleDateString(locale(lang), { weekday: "short", timeZone: IST }) : isoDate;
}

export function timeAgo(v: string | null | undefined, t: T) {
  const d = parse(v);
  if (!d) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return t("just now");
  if (diff < 3600) return t("{0} min ago", [Math.floor(diff / 60)]);
  if (diff < 86400) return t("{0} h ago", [Math.floor(diff / 3600)]);
  return t("{0} days ago", [Math.floor(diff / 86400)]);
}

export function titleCase(s: string | null | undefined) {
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Status ka rang (mobile app ke statusColor jaisa) */
export function statusColor(s: string | null | undefined): string {
  switch (s) {
    case "open": case "pending": case "unpaid": case "trial": case "info": case "created":
      return "var(--info)";
    case "accepted": case "reached": case "in_progress": case "partial": case "investigating":
    case "waiting_on_user": case "past_due": case "busy": case "high":
      return "var(--warning)";
    case "completed": case "active": case "approved": case "verified": case "paid": case "resolved":
    case "success": case "available": case "captured":
      return "var(--success)";
    case "cancelled": case "expired": case "blocked": case "rejected": case "failed": case "dismissed":
    case "suspended": case "urgent":
      return "var(--error)";
  }
  return "var(--text-2)";
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open", pending: "Pending", accepted: "Accepted", reached: "Reached", in_progress: "On Trip",
  completed: "Completed", cancelled: "Cancelled", expired: "Expired", approved: "Approved", blocked: "Blocked",
  suspended: "Suspended", active: "Active", verified: "Verified", rejected: "Rejected", unpaid: "Unpaid",
  partial: "Partly paid", paid: "Paid", trial: "Trial", past_due: "Past due", resolved: "Resolved",
  closed: "Closed", investigating: "Investigating", dismissed: "Dismissed", waiting_on_user: "Waiting on user",
  available: "Available", busy: "Busy", offline: "Offline", low: "Low", normal: "Normal", high: "High",
  urgent: "Urgent", captured: "Paid", failed: "Failed", created: "Created", driver: "Driver", agency: "Agency",
  super_admin: "Super Admin", customer: "Customer", other: "Other",
};

/** Status label (user ki language me) */
export function statusLabel(s: string | null | undefined, t: T): string {
  return s && STATUS_LABELS[s] ? t(STATUS_LABELS[s]) : titleCase(s);
}

const DUTY_TYPES: Record<string, string> = {
  one_way: "One Way", two_way: "Round Trip", tour: "Outstation", local: "Local", airport: "Airport",
};
export function dutyTypeLabel(s: string | null | undefined, t: T) {
  return s && DUTY_TYPES[s] ? t(DUTY_TYPES[s]) : titleCase(s);
}

/** HR01AB1234 → HR 01 AB 1234 */
export function regNo(r: string | null | undefined) {
  if (!r) return "—";
  const m = r.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(" ") : r;
}
