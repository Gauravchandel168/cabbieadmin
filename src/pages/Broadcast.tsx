import { useEffect, useState } from "react";
import { Megaphone, Send, Trash2, X } from "lucide-react";
import { notifyApi, userApi } from "../api/api";
import type { AdminUser } from "../api/types";
import { useDebounced } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, statusLabel } from "../lib/format";
import { Avatar, Badge, Chips, Empty, Field } from "../components/ui";

type Mode = "role" | "users";
type Target = "" | "driver" | "agency";
interface HistoryItem { at: string; title: string; message: string; target: string; recipients: number }

const HKEY = "dl_admin_broadcasts";
function readHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(HKEY) || "[]") as HistoryItem[]; } catch { return []; }
}

export default function Broadcast() {
  const t = useT();
  const { lang } = useLang();
  const { run, busy } = useAction();
  const [mode, setMode] = useState<Mode>("role");
  const [target, setTarget] = useState<Target>("driver");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>(readHistory);

  const valid = title.trim() && message.trim() && (mode === "role" || users.length > 0);
  const targetText = mode === "users"
    ? t("{0} selected users", [users.length])
    : target === "" ? t("Everyone") : target === "driver" ? t("All drivers") : t("All agencies");

  const send = async () => {
    const res = await run(
      () => mode === "role"
        ? notifyApi.broadcast(title.trim(), message.trim(), target)
        : notifyApi.send(users.map((u) => u.id), title.trim(), message.trim()),
      (r) => t("Sent to {0} users", [r.data?.recipients ?? 0]),
    );
    if (!res) return;
    const item: HistoryItem = { at: new Date().toISOString(), title: title.trim(), message: message.trim(), target: targetText, recipients: res.data?.recipients ?? 0 };
    const next = [item, ...history].slice(0, 30);
    setHistory(next);
    try { localStorage.setItem(HKEY, JSON.stringify(next)); } catch { /* ignore */ }
    setTitle(""); setMessage(""); setUsers([]);
  };

  return (
    <div className="grid grid-main">
      <div className="card">
        <div className="card-head"><Megaphone size={18} className="text-primary" /><h2>{t("New notification")}</h2></div>
        <Field label={t("Send to")}>
          <Chips<Mode> value={mode} onChange={setMode} options={[
            { value: "role", label: t("By role") },
            { value: "users", label: t("Specific users") },
          ]} />
        </Field>
        {mode === "role" ? (
          <Field label={t("Audience")}>
            <Chips<Target> value={target} onChange={setTarget} options={[
              { value: "driver", label: t("All drivers") },
              { value: "agency", label: t("All agencies") },
              { value: "", label: t("Everyone") },
            ]} />
          </Field>
        ) : (
          <UserPicker value={users} onChange={setUsers} />
        )}
        <Field label={t("Title")}>
          <input className="input" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. App maintenance tonight")} />
        </Field>
        <Field label={t("Message")} hint={t("{0}/500", [message.length])}>
          <textarea className="textarea" maxLength={500} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        {title && message && (
          <div className="mb">
            <div className="small muted mb">{t("Preview")}</div>
            <div className="card" style={{ background: "var(--bg)", marginBottom: 0 }}>
              <div className="bold">{title}</div>
              <div className="small">{message}</div>
            </div>
          </div>
        )}
        <button className="btn cta block" disabled={busy || !valid} onClick={send}>
          <Send size={16} />{busy ? t("Please wait…") : t("Send to {0}", [targetText])}
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("Sent from this browser")}</h2>
          {history.length > 0 && (
            <div className="actions">
              <button className="btn sm ghost" onClick={() => { setHistory([]); localStorage.removeItem(HKEY); }}><Trash2 size={14} />{t("Clear")}</button>
            </div>
          )}
        </div>
        {history.length === 0 ? <Empty title={t("Nothing sent yet")} sub={t("History is kept only in this browser.")} /> : (
          <div className="timeline">
            {history.map((h, i) => (
              <div className="item" key={i}>
                <div className="row between"><b>{h.title}</b><span className="tiny muted">{dateTime(h.at, lang)}</span></div>
                <div className="small">{h.message}</div>
                <div className="tiny muted">{h.target} · {t("{0} recipients", [h.recipients])}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserPicker({ value, onChange }: { value: AdminUser[]; onChange: (u: AdminUser[]) => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const q = useDebounced(text, 300);
  const [items, setItems] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    let alive = true;
    userApi.list({ search: q, limit: 8 }).then((r) => alive && setItems(r.items)).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [q]);

  const add = (u: AdminUser) => { if (!value.some((x) => x.id === u.id)) onChange([...value, u]); setText(""); };

  return (
    <Field label={t("Users")}>
      {value.length > 0 && (
        <div className="row wrap mb" style={{ gap: 6 }}>
          {value.map((u) => (
            <span key={u.id} className="chip active" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {u.name}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => onChange(value.filter((x) => x.id !== u.id))} />
            </span>
          ))}
        </div>
      )}
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Search by name or phone...")} />
      {items.length > 0 && (
        <div className="card" style={{ padding: 6, marginTop: 6, marginBottom: 0 }}>
          {items.map((u) => (
            <div key={u.id} className="row list-row" style={{ cursor: "pointer", padding: 6 }} onClick={() => add(u)}>
              <Avatar name={u.name} />
              <div className="grow">
                <div className="bold">{u.name}</div>
                <div className="tiny muted">{u.phoneNumber}</div>
              </div>
              <Badge>{statusLabel(u.role, t)}</Badge>
            </div>
          ))}
        </div>
      )}
    </Field>
  );
}
