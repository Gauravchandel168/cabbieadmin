import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Send, UserCheck } from "lucide-react";
import { supportApi } from "../api/api";
import type { SupportTicket } from "../api/types";
import { useAsync, useDebounced, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, statusLabel, timeAgo, titleCase } from "../lib/format";
import { useAuth } from "../auth/AuthContext";
import { AsyncBlock, Badge, Chips, Drawer, Empty, InfoRow, Pager, SearchBox, StatusBadge } from "../components/ui";

type TFilter = "active" | "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed" | "all";
const CATEGORIES = ["", "payment", "subscription", "duty", "account", "technical", "other"];
const STATUSES = ["open", "in_progress", "waiting_on_user", "resolved", "closed"];

export default function Support() {
  const t = useT();
  const [status, setStatus] = useState<TFilter>("active");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const list = usePaged((page) => supportApi.tickets({ page, limit: 20, status, category, search: q }), [status, category, q]);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {open && <TicketDrawer id={open} onClose={() => setOpen(null)} onChanged={() => list.reload(true)} />}
      <div className="toolbar">
        <Chips<TFilter> value={status} onChange={setStatus} options={[
          { value: "active", label: t("Active") },
          { value: "open", label: t("Open") },
          { value: "in_progress", label: t("In progress") },
          { value: "waiting_on_user", label: t("Waiting on user") },
          { value: "resolved", label: t("Resolved") },
          { value: "closed", label: t("Closed") },
          { value: "all", label: t("All") },
        ]} />
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search subject, name, phone or ticket no...")} />
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c ? t(titleCase(c)) : t("All categories")}</option>)}
        </select>
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<LifeBuoy size={28} />} title={t("No tickets found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Ticket")}</th><th className="hide-mobile">{t("From")}</th><th>{t("Priority")}</th>
                  <th>{t("Status")}</th><th className="hide-mobile">{t("Last message")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((x) => (
                  <tr key={x.id} className="clickable" onClick={() => setOpen(x.id)}>
                    <td>
                      <div className="cell-title">{x.unreadByAdmin && <span className="dot" title={t("Unread")} />}#{x.ticketNo} · {x.subject}</div>
                      <div className="cell-sub">{t(titleCase(x.category))}</div>
                    </td>
                    <td className="hide-mobile">
                      <div>{x.userName || "—"}</div>
                      <div className="tiny muted">{x.userPhone} {x.userRole ? `• ${statusLabel(x.userRole, t)}` : ""}</div>
                    </td>
                    <td><StatusBadge status={x.priority} /></td>
                    <td><StatusBadge status={x.status} /></td>
                    <td className="hide-mobile small muted">{timeAgo(x.lastMessageAt, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>
    </>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const { user } = useAuth();
  const { run, busy } = useAction();
  const tk = useAsync(() => supportApi.ticket(id), [id]);
  const [msg, setMsg] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const d: SupportTicket | null = tk.data;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [d?.messages?.length]);

  const refresh = () => { tk.reload(true); onChanged(); };
  const send = async () => {
    const text = msg.trim();
    if (!text) return;
    if (await run(() => supportApi.reply(id, text), t("Reply sent"))) {
      setMsg("");
      refresh();
    }
  };

  return (
    <Drawer title={d ? `#${d.ticketNo} · ${d.subject}` : t("Ticket")} sub={d ? `${d.userName || ""} • ${d.userPhone || ""}` : undefined} onClose={onClose}>
      <AsyncBlock loading={tk.loading} error={tk.error} onRetry={() => tk.reload()}>
        {d && (
          <>
            <div className="card">
              <InfoRow k={t("Category")} v={t(titleCase(d.category))} />
              <InfoRow k={t("Priority")} v={<StatusBadge status={d.priority} />} />
              <InfoRow k={t("Role")} v={d.userRole ? <Badge>{statusLabel(d.userRole, t)}</Badge> : "—"} />
              <InfoRow k={t("Created")} v={dateTime(d.createdAt, lang)} />
              <InfoRow k={t("Assigned")} v={d.assignedTo ? (d.assignedTo === user?.id ? t("You") : t("Another admin")) : t("Unassigned")} />
              <div className="row wrap mt">
                <select className="select" style={{ width: "auto" }} value={d.status} disabled={busy}
                  onChange={async (e) => { if (await run(() => supportApi.setStatus(id, e.target.value))) refresh(); }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
                </select>
                {d.assignedTo !== user?.id && (
                  <button className="btn sm outline" disabled={busy} onClick={async () => {
                    if (await run(() => supportApi.assign(id))) refresh();
                  }}><UserCheck size={14} />{t("Assign to me")}</button>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>{t("Conversation")}</h2></div>
              <div className="chat">
                {(d.messages || []).length === 0 && <div className="small muted">{t("No messages yet")}</div>}
                {(d.messages || []).map((m) => (
                  <div key={m.id} className={`bubble ${m.isFromAdmin ? "mine" : ""}`}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                    {m.attachmentUrls?.map((u) => (
                      <div key={u}><a href={u} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>{t("Attachment")}</a></div>
                    ))}
                    <div className="meta">{m.isFromAdmin ? t("Support") : m.senderName || d.userName} · {dateTime(m.createdAt, lang)}</div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {d.status !== "closed" ? (
                <div className="mt">
                  <textarea className="textarea" placeholder={t("Write a reply…")} value={msg} onChange={(e) => setMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }} />
                  <div className="row between mt">
                    <span className="tiny muted">{t("Ctrl + Enter to send")}</span>
                    <button className="btn" disabled={busy || !msg.trim()} onClick={send}><Send size={16} />{t("Send")}</button>
                  </div>
                </div>
              ) : <div className="banner info mt">{t("This ticket is closed. Change the status to reply.")}</div>}
            </div>
          </>
        )}
      </AsyncBlock>
    </Drawer>
  );
}
