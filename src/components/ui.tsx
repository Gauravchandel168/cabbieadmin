import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, RefreshCw, Search, X } from "lucide-react";
import { errorMessage, type Pagination as PaginationT } from "../api/client";
import { useT } from "../i18n";
import { statusColor, statusLabel } from "../lib/format";

// ── Toast ───────────────────────────────────────────────
type ToastKind = "info" | "success" | "error";
interface ToastItem { id: number; text: string; kind: ToastKind }
const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="toasts">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.kind === "info" ? "" : i.kind}`}>{i.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ── Status / loading ────────────────────────────────────
function tint(c: string) {
  return { color: c, background: `color-mix(in srgb, ${c} 13%, transparent)` };
}

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  const t = useT();
  return <span className="badge" style={tint(statusColor(status))}>{label ?? statusLabel(status, t)}</span>;
}

export function Badge({ color = "var(--primary)", children }: { color?: string; children: ReactNode }) {
  return <span className="badge" style={tint(color)}>{children}</span>;
}

export function Loading() {
  return <div className="loading"><div className="spinner" /></div>;
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="error-box">
      <AlertCircle size={18} />
      <span className="grow">{message}</span>
      {onRetry && <button className="btn sm outline" onClick={onRetry}><RefreshCw size={14} />{t("Retry")}</button>}
    </div>
  );
}

export function Empty({ icon, title, sub, action }: { icon?: ReactNode; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon-wrap">{icon ?? <Inbox size={28} />}</div>
      <h3>{title}</h3>
      {sub && <div className="small">{sub}</div>}
      {action && <div className="mt">{action}</div>}
    </div>
  );
}

/** Loading / error / empty / content ek saath */
export function AsyncBlock({
  loading, error, empty, onRetry, children,
}: { loading: boolean; error: string | null; empty?: ReactNode | false; onRetry?: () => void; children?: ReactNode }) {
  if (loading) return <Loading />;
  if (error) return <div style={{ padding: 16 }}><ErrorBox message={error} onRetry={onRetry} /></div>;
  if (empty) return <>{empty}</>;
  return <>{children}</>;
}

export function StatCard({
  icon, label, value, color = "var(--primary)", caption, onClick,
}: { icon: ReactNode; label: string; value: ReactNode; color?: string; caption?: ReactNode; onClick?: () => void }) {
  return (
    <div className={`stat ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="icon" style={tint(color)}>{icon}</div>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {caption && <div className="caption" style={{ color }}>{caption}</div>}
    </div>
  );
}

export function Avatar({ name, size }: { name: string | null | undefined; size?: "lg" }) {
  const n = (name || "?").trim();
  const ini = n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`avatar ${size === "lg" ? "lg" : ""}`}>{ini || "?"}</div>;
}

export function InfoRow({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="info-row">
      <div className="k">{k}</div>
      <div className="v grow">{v === null || v === undefined || v === "" ? "—" : v}</div>
    </div>
  );
}

// ── Inputs ──────────────────────────────────────────────
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="input-icon">
      <Search size={16} />
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Chips<V extends string>({
  options, value, onChange,
}: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.value} type="button" className={`chip ${o.value === value ? "active" : ""}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Pager({ pagination, page, onPage }: { pagination: PaginationT | null; page: number; onPage: (p: number) => void }) {
  const t = useT();
  if (!pagination || pagination.total === 0) return null;
  if (pagination.totalPages <= 1) {
    return <div className="pagination small muted">{t("{0} total", [pagination.total])}</div>;
  }
  return (
    <div className="pagination">
      <span className="small muted">{t("Page {0} of {1} • {2} total", [page, pagination.totalPages, pagination.total])}</span>
      <button className="btn sm outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="previous"><ChevronLeft size={16} /></button>
      <button className="btn sm outline" disabled={page >= pagination.totalPages} onClick={() => onPage(page + 1)} aria-label="next"><ChevronRight size={16} /></button>
    </div>
  );
}

// ── Modal / drawer ──────────────────────────────────────
function useEsc(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Modal({
  title, onClose, children, footer, wide,
}: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEsc(onClose);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog">
        <div className="modal-head">
          <h2 className="grow">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, sub, onClose, children }: { title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEsc(onClose);
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="grow" style={{ minWidth: 0 }}>
            <h2 className="ellipsis">{title}</h2>
            {sub && <div className="small" style={{ opacity: 0.85 }}>{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

/** Confirm dialog — reason chahiye to text box bhi */
export interface ConfirmSpec {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  askReason?: boolean;
  reasonLabel?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => Promise<unknown> | void;
}

function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { askReason, reasonRequired = true } = spec;
  const disabled = busy || (askReason && reasonRequired && !reason.trim());
  const go = async () => {
    setBusy(true);
    try {
      await spec.onConfirm(reason.trim());
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={spec.title}
      onClose={onClose}
      footer={
        <>
          <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
          <button className={`btn ${spec.danger ? "danger" : ""}`} disabled={!!disabled} onClick={go}>
            {busy ? t("Please wait…") : spec.confirmLabel ?? t("Confirm")}
          </button>
        </>
      }
    >
      {spec.message && <p className="muted" style={{ marginTop: 0 }}>{spec.message}</p>}
      {askReason && (
        <Field label={spec.reasonLabel ?? t("Reason")}>
          <textarea className="textarea" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

/** const { confirm, confirmNode } = useConfirm(); … {confirmNode} */
export function useConfirm() {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  const node = spec ? <ConfirmDialog spec={spec} onClose={() => setSpec(null)} /> : null;
  return { confirm: setSpec, confirmNode: node };
}
