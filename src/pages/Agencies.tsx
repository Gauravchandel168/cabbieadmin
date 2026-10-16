import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck, Ban, Building2, CheckCircle2, KeyRound, LogOut, PauseCircle, Plus, Trash2, UserCog, Unlock } from "lucide-react";
import { agencyApi, dutyApi, financeApi, userApi } from "../api/api";
import type { Agency } from "../api/types";
import { useAsync, useDebounced, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { date, dateTime, money, num } from "../lib/format";
import {
  AsyncBlock, Avatar, Badge, Chips, Drawer, Empty, Field, InfoRow, Modal, Pager, SearchBox, StatusBadge, useConfirm,
} from "../components/ui";
import { ResetPasswordModal, useImpersonate } from "./Users";

type StatusFilter = "" | "pending" | "approved" | "blocked" | "suspended";

export default function Agencies() {
  const t = useT();
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") || "") as StatusFilter;
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const q = useDebounced(search);
  const c = useDebounced(city);
  const [open, setOpen] = useState<Agency | null>(null);
  const [creating, setCreating] = useState(false);

  const list = usePaged((page) => agencyApi.list({ page, limit: 20, status, search: q, city: c }), [status, q, c]);

  return (
    <>
      <div className="toolbar">
        <Chips<StatusFilter>
          value={status}
          onChange={(v) => setParams(v ? { status: v } : {})}
          options={[
            { value: "", label: t("All") },
            { value: "pending", label: t("Pending") },
            { value: "approved", label: t("Approved") },
            { value: "blocked", label: t("Blocked") },
            { value: "suspended", label: t("Suspended") },
          ]}
        />
        <div className="grow" />
        <button className="btn" onClick={() => setCreating(true)}><Plus size={16} />{t("Add agency")}</button>
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search by name, agency, phone")} />
        <input className="input" style={{ maxWidth: 200 }} value={city} placeholder={t("City")} onChange={(e) => setCity(e.target.value)} />
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<Building2 size={28} />} title={t("No agencies found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Agency")}</th>
                  <th>{t("Owner")}</th>
                  <th className="hide-mobile">{t("City")}</th>
                  <th>{t("Drivers")}</th>
                  <th>{t("Status")}</th>
                  <th className="hide-mobile">{t("Joined")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => setOpen(a)}>
                    <td>
                      <div className="row">
                        <Avatar name={a.name} />
                        <div>
                          <div className="cell-title">
                            {a.name} {a.isVerified && <BadgeCheck size={14} className="text-primary" style={{ verticalAlign: -2 }} />}
                          </div>
                          <div className="cell-sub mono">{a.inviteCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{a.ownerName || "—"}</div>
                      <div className="cell-sub">{a.ownerPhone || a.phoneNumber || ""}</div>
                    </td>
                    <td className="hide-mobile">{a.city || "—"}</td>
                    <td>{num(a.activeDrivers)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="hide-mobile small muted">{date(a.createdAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>

      {open && (
        <AgencyDrawer
          agency={open}
          onClose={() => setOpen(null)}
          onChanged={() => list.reload(true)}
          onDeleted={() => { setOpen(null); list.reload(true); }}
        />
      )}
      {creating && <CreateAgencyModal onClose={() => setCreating(false)} onCreated={() => list.reload(true)} />}
    </>
  );
}

function AgencyDrawer({
  agency, onClose, onChanged, onDeleted,
}: { agency: Agency; onClose: () => void; onChanged: () => void; onDeleted: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const [tab, setTab] = useState<"overview" | "drivers" | "duties" | "plan">("overview");
  const { run } = useAction();
  const { confirm, confirmNode } = useConfirm();
  const { impersonate, impersonateNode } = useImpersonate();
  const [resetOpen, setResetOpen] = useState(false);

  const detail = useAsync(() => agencyApi.get(agency.id), [agency.id]);
  const a = detail.data ?? agency;

  const refresh = async () => {
    await detail.reload(true);
    onChanged();
  };
  const tabs = { overview: "Overview", drivers: "Drivers", duties: "Duties", plan: "Subscription" } as const;

  return (
    <Drawer title={a.name} sub={<>{t("Invite code")}: <span className="mono">{a.inviteCode}</span></>} onClose={onClose}>
      {confirmNode}
      {impersonateNode}
      {resetOpen && <ResetPasswordModal userId={a.user_id} name={a.ownerName || a.name} onClose={() => setResetOpen(false)} />}

      <div className="tabs">
        {(Object.keys(tabs) as (keyof typeof tabs)[]).map((k) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{t(tabs[k])}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="card">
            <div className="row mb">
              <StatusBadge status={a.status} />
              {a.isVerified && <Badge color="var(--primary)"><BadgeCheck size={12} />{t("Verified")}</Badge>}
            </div>
            {a.status === "pending" && <div className="banner warning mb">{t("This agency is waiting for approval. Approving also approves the owner's account.")}</div>}
            {a.blockReason && (a.status === "blocked" || a.status === "suspended") && (
              <div className="banner error mb">{t("Reason")}: {a.blockReason}</div>
            )}
            <InfoRow k={t("Owner")} v={a.ownerName} />
            <InfoRow k={t("Owner phone")} v={a.ownerPhone} />
            <InfoRow k={t("Agency phone")} v={a.phoneNumber} />
            <InfoRow k={t("Email")} v={a.email} />
            <InfoRow k={t("Address")} v={[a.address, a.city, a.state, a.pincode].filter(Boolean).join(", ")} />
            <InfoRow k="GSTIN" v={a.gstNumber} />
            <InfoRow k="PAN" v={a.panNumber} />
            <InfoRow k={t("Active drivers")} v={num(a.activeDrivers)} />
            <InfoRow k={t("Shared duties")} v={a.acceptsSharedDuties ? t("Accepts") : t("Does not accept")} />
            <InfoRow k={t("Joined")} v={dateTime(a.createdAt, lang)} />
            {a.approvedAt && <InfoRow k={t("Approved on")} v={dateTime(a.approvedAt, lang)} />}
          </div>

          <div className="card">
            <h3 className="mb">{t("Actions")}</h3>
            <div className="row wrap">
              {a.status === "pending" && (
                <button className="btn success" onClick={async () => { if (await run(() => agencyApi.approve(a.id))) refresh(); }}>
                  <CheckCircle2 size={16} />{t("Approve")}
                </button>
              )}
              {(a.status === "approved" || a.status === "pending") && (
                <button className="btn danger" onClick={() => confirm({
                  title: t("Block {0}?", [a.name]), danger: true, askReason: true, confirmLabel: t("Block"),
                  message: t("The agency won't be able to post duties and its drivers stop getting its duties."),
                  onConfirm: async (reason) => { await agencyApi.block(a.id, reason); await refresh(); },
                })}><Ban size={16} />{t("Block")}</button>
              )}
              {a.status === "approved" && (
                <button className="btn warning" onClick={() => confirm({
                  title: t("Suspend {0}?", [a.name]), askReason: true, confirmLabel: t("Suspend"),
                  onConfirm: async (reason) => { await agencyApi.setStatus(a.id, "suspended", reason); await refresh(); },
                })}><PauseCircle size={16} />{t("Suspend")}</button>
              )}
              {(a.status === "blocked" || a.status === "suspended") && (
                <button className="btn success" onClick={async () => { if (await run(() => agencyApi.unblock(a.id))) refresh(); }}>
                  <Unlock size={16} />{t("Unblock")}
                </button>
              )}
              {!a.isVerified && (
                <button className="btn outline" onClick={async () => { if (await run(() => agencyApi.verify(a.id))) refresh(); }}>
                  <BadgeCheck size={16} />{t("Mark verified")}
                </button>
              )}
            </div>
            <div className="divider" />
            <h3 className="mb">{t("Owner account")}</h3>
            <div className="row wrap">
              <button className="btn outline" onClick={() => impersonate(a.user_id, a.ownerName || a.name)}><UserCog size={16} />{t("Impersonate")}</button>
              <button className="btn outline" onClick={() => setResetOpen(true)}><KeyRound size={16} />{t("Reset password")}</button>
              <button className="btn outline" onClick={() => confirm({
                title: t("Force logout {0}?", [a.ownerName || a.name]),
                message: t("All sessions of this user will be signed out."),
                confirmLabel: t("Force logout"),
                onConfirm: async () => { await userApi.forceLogout(a.user_id); },
              })}><LogOut size={16} />{t("Force logout")}</button>
            </div>
            <div className="divider" />
            <button className="btn danger-outline" onClick={() => confirm({
              title: t("Delete {0}?", [a.name]), danger: true, confirmLabel: t("Delete"),
              message: t("This removes the agency permanently. This cannot be undone."),
              onConfirm: async () => { await agencyApi.remove(a.id); onDeleted(); },
            })}><Trash2 size={16} />{t("Delete agency")}</button>
          </div>
        </>
      )}

      {tab === "drivers" && <AgencyDriversTab agencyId={a.id} />}
      {tab === "duties" && <AgencyDutiesTab agencyId={a.id} />}
      {tab === "plan" && <AgencyPlanTab agencyId={a.id} />}
    </Drawer>
  );
}

function AgencyDriversTab({ agencyId }: { agencyId: string }) {
  const t = useT();
  const [status, setStatus] = useState("active");
  const list = usePaged((page) => agencyApi.drivers(agencyId, { page, limit: 20, status }), [agencyId, status]);
  return (
    <>
      <div className="mb">
        <Chips value={status} onChange={setStatus} options={[
          { value: "active", label: t("Active") },
          { value: "requests", label: t("Requests") },
          { value: "invited_by_agency", label: t("Invited") },
          { value: "blocked", label: t("Blocked") },
        ]} />
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty title={t("No drivers found")} />}>
          {list.items.map((d) => (
            <div key={d.linkId} className="list-row">
              <Avatar name={d.name} />
              <div className="grow">
                <div className="bold">{d.name} {d.isPriority && <Badge color="var(--amber)">★ {t("Priority")}</Badge>}</div>
                <div className="tiny muted">
                  {[d.phoneNumber, d.primaryVehicle?.vehicleTypeName, d.rating > 0 ? `${d.rating.toFixed(1)}★` : null, t("{0} trips", [d.totalCompletedDuties])]
                    .filter(Boolean).join(" • ")}
                </div>
              </div>
              <StatusBadge status={d.availability} />
            </div>
          ))}
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>
    </>
  );
}

function AgencyDutiesTab({ agencyId }: { agencyId: string }) {
  const t = useT();
  const { lang } = useLang();
  const list = usePaged((page) => dutyApi.list({ page, limit: 15, agencyId }), [agencyId]);
  return (
    <div className="card flush">
      <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
        empty={!list.items.length && <Empty title={t("No duties found")} />}>
        {list.items.map((d) => (
          <div key={d.id} className="list-row">
            <div className="grow">
              <div className="bold ellipsis">{d.fromLocation} → {d.toLocation}</div>
              <div className="tiny muted">{dateTime(d.forDate, lang)} • {d.acceptedDriverName || t("No driver yet")}</div>
            </div>
            <div className="col" style={{ alignItems: "flex-end" }}>
              <StatusBadge status={d.status} />
              <span className="small bold">{money(d.finalAmount ?? d.fareAmount, "")}</span>
            </div>
          </div>
        ))}
        <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
      </AsyncBlock>
    </div>
  );
}

function AgencyPlanTab({ agencyId }: { agencyId: string }) {
  const t = useT();
  const { lang } = useLang();
  const ent = useAsync(() => agencyApi.subscription(agencyId), [agencyId]);
  const payments = usePaged((page) => agencyApi.payments(agencyId, { page, limit: 10 }), [agencyId]);
  const [setting, setSetting] = useState(false);
  const e = ent.data;
  return (
    <>
      <AsyncBlock loading={ent.loading} error={ent.error} onRetry={() => ent.reload()}>
        {e && (
          <div className="hero mb" style={{ background: "var(--grad-blue-teal)" }}>
            <div>
              <div className="small" style={{ opacity: 0.85 }}>{e.isTrial ? t("Trial running") : t("Current plan")}</div>
              <h2 style={{ fontSize: 22 }}>{e.plan?.name || "—"}</h2>
              {e.subscription && (
                <div className="small" style={{ opacity: 0.9 }}>
                  {t("{0} days left • till {1}", [e.daysLeft, date(e.subscription.currentPeriodEnd, lang)])}
                </div>
              )}
            </div>
            <div className="hero-stats">
              <div><div className="v">{e.activeDrivers}{e.maxDrivers != null ? `/${e.maxDrivers}` : ""}</div><div className="l">{t("Drivers")}</div></div>
              <div><div className="v">{e.dutiesThisMonth}{e.maxDutiesPerMonth != null ? `/${e.maxDutiesPerMonth}` : ""}</div><div className="l">{t("Duties this month")}</div></div>
            </div>
          </div>
        )}
      </AsyncBlock>
      <button className="btn block mb" onClick={() => setSetting(true)}>{t("Set plan manually (cash / bank deal)")}</button>
      <div className="card flush">
        <div className="card-head"><h2>{t("Payments")}</h2></div>
        <AsyncBlock loading={payments.loading} error={payments.error} onRetry={() => payments.reload()}
          empty={!payments.items.length && <Empty title={t("No payments yet")} />}>
          {payments.items.map((p) => (
            <div key={p.id} className="list-row">
              <div className="grow">
                <div className="bold">{p.planName || p.planCode} • {money(p.amount)}</div>
                <div className="tiny muted">{dateTime(p.paidAt || p.createdAt, lang)}{p.isMock ? " • TEST" : ""}</div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
          <Pager pagination={payments.pagination} page={payments.page} onPage={payments.goTo} />
        </AsyncBlock>
      </div>
      {setting && <SetPlanModal agencyId={agencyId} onClose={() => setSetting(false)} onDone={() => { ent.reload(true); payments.reload(true); }} />}
    </>
  );
}

function SetPlanModal({ agencyId, onClose, onDone }: { agencyId: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const plans = useAsync(() => financeApi.plans(), []);
  const { run, busy } = useAction();
  const [planCode, setPlanCode] = useState("");
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState("");
  return (
    <Modal title={t("Set plan")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || !planCode} onClick={async () => {
          if (await run(() => agencyApi.setPlan(agencyId, planCode, months, note), t("Plan updated"))) { onDone(); onClose(); }
        }}>{t("Save")}</button>
      </>
    }>
      <div className="banner info mb">{t("Use this for cash / bank transfer deals or free extensions. The new period starts now.")}</div>
      <Field label={t("Plan")}>
        <select className="select" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
          <option value="">{t("Select")}</option>
          {(plans.data || []).filter((p) => p.isActive).map((p) => (
            <option key={p.id} value={p.code}>{p.name} — {money(p.price)}/{p.billingPeriod === "yearly" ? t("year") : t("month")}</option>
          ))}
        </select>
      </Field>
      <Field label={t("Months")} hint={t("1 to 36")}>
        <input className="input" type="number" min={1} max={36} value={months}
          onChange={(e) => setMonths(Math.max(1, Math.min(36, Number(e.target.value) || 1)))} />
      </Field>
      <Field label={t("Note")}>
        <input className="input" value={note} placeholder={t("e.g. Paid ₹2,000 cash on 5 Oct")} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

function CreateAgencyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [f, setF] = useState({ name: "", phone: "", email: "", agencyName: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim().length >= 2 && f.phone.replace(/\D/g, "").length >= 10 && f.agencyName.trim().length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) && f.password.length >= 8;
  return (
    <Modal title={t("Add agency")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || !valid} onClick={async () => {
          const r = await run(
            () => agencyApi.createWithOwner({ ...f, name: f.name.trim(), agencyName: f.agencyName.trim(), phone: f.phone.trim(), email: f.email.trim() }),
            t("Agency created"),
          );
          if (r) { onCreated(); onClose(); }
        }}>{t("Create")}</button>
      </>
    }>
      <div className="banner info mb">{t("Creates the owner's login account and the agency together.")}</div>
      <Field label={t("Agency name")}><input className="input" value={f.agencyName} onChange={set("agencyName")} /></Field>
      <div className="form-grid">
        <Field label={t("Owner name")}><input className="input" value={f.name} onChange={set("name")} /></Field>
        <Field label={t("Owner phone")}><input className="input" inputMode="tel" value={f.phone} onChange={set("phone")} /></Field>
      </div>
      <div className="form-grid">
        <Field label={t("Email")} hint={t("Required by the server")}><input className="input" type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label={t("Password")} hint={t("At least 8 characters")}><input className="input" value={f.password} onChange={set("password")} /></Field>
      </div>
    </Modal>
  );
}
