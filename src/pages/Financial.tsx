import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeIndianRupee, CalendarClock, CreditCard, Gift, Layers, Pencil, Plus, TrendingUp, Users } from "lucide-react";
import { financeApi, type PlanBody } from "../api/api";
import type { SubscriptionPlan } from "../api/types";
import { useAsync, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT, type T } from "../i18n";
import { date, dateTime, money, num, titleCase } from "../lib/format";
import { AsyncBlock, Badge, Chips, Empty, Field, Modal, Pager, StatCard, StatusBadge, Switch } from "../components/ui";
import AgencyPicker from "../components/AgencyPicker";
import type { Agency } from "../api/types";

type Tab = "revenue" | "subscriptions" | "payments" | "plans";

export const FEATURES: { key: string; label: string }[] = [
  { key: "duty_exchange", label: "Duty exchange between agencies" },
  { key: "recurring_duties", label: "Recurring duties" },
  { key: "invoices", label: "Invoices" },
  { key: "live_tracking", label: "Live tracking" },
  { key: "reports_export", label: "Reports export" },
  { key: "priority_support", label: "Priority support" },
];

export default function Financial() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("revenue");
  const tabs: { k: Tab; l: string }[] = [
    { k: "revenue", l: t("Revenue") },
    { k: "subscriptions", l: t("Subscriptions") },
    { k: "payments", l: t("Payments") },
    { k: "plans", l: t("Plans") },
  ];
  return (
    <>
      <div className="tabs">
        {tabs.map((x) => (
          <button key={x.k} className={`tab ${tab === x.k ? "active" : ""}`} onClick={() => setTab(x.k)}>{x.l}</button>
        ))}
      </div>
      {tab === "revenue" && <RevenueTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "plans" && <PlansTab />}
    </>
  );
}

function RevenueTab() {
  const t = useT();
  const r = useAsync(() => financeApi.revenue(), []);
  const d = r.data;
  return (
    <AsyncBlock loading={r.loading} error={r.error} onRetry={() => r.reload()}>
      {d && (
        <>
          <div className="grid grid-4 mb">
            <StatCard icon={<BadgeIndianRupee size={20} />} color="var(--success)" label={t("Total revenue")} value={money(d.totalRevenue)} />
            <StatCard icon={<TrendingUp size={20} />} label={t("This month")} value={money(d.thisMonth)}
              caption={t("Last month: {0}", [money(d.lastMonth)])} />
            <StatCard icon={<Layers size={20} />} color="var(--purple)" label="MRR" value={money(d.mrr)} />
            <StatCard icon={<CalendarClock size={20} />} color="var(--warning)" label={t("Expiring in 7 days")} value={num(d.expiringIn7Days)} />
          </div>
          <div className="grid grid-3 mb">
            <StatCard icon={<CreditCard size={20} />} color="var(--teal)" label={t("Paid agencies")} value={num(d.activePaid)} />
            <StatCard icon={<Gift size={20} />} color="var(--info)" label={t("On trial")} value={num(d.activeTrials)} />
            <StatCard icon={<Users size={20} />} color="var(--text-2)" label={t("Free agencies")} value={num(d.freeAgencies)} />
          </div>
          <div className="grid grid-main">
            <div className="card">
              <div className="card-head"><h2>{t("Monthly revenue")}</h2></div>
              {d.monthly?.length ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={d.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} width={60} />
                      <Tooltip formatter={(v: number) => money(v)} />
                      <Bar dataKey="revenue" name={t("Revenue")} fill="#14b8a6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <Empty title={t("No payments yet")} />}
            </div>
            <div className="card">
              <div className="card-head"><h2>{t("Agencies by plan")}</h2></div>
              {d.byPlan?.length ? (
                <table className="table">
                  <thead><tr><th>{t("Plan")}</th><th className="right">{t("Active")}</th><th className="right">{t("Trial")}</th></tr></thead>
                  <tbody>
                    {d.byPlan.map((p) => (
                      <tr key={p.planCode}>
                        <td><b>{p.planName}</b><div className="tiny muted mono">{p.planCode}</div></td>
                        <td className="right">{num(p.active)}</td>
                        <td className="right">{num(p.trial)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="small muted">{t("No data yet")}</div>}
            </div>
          </div>
        </>
      )}
    </AsyncBlock>
  );
}

type SubFilter = "live" | "expiring" | "trial" | "active" | "cancelled" | "expired" | "all";

function SubscriptionsTab() {
  const t = useT();
  const { lang } = useLang();
  const [status, setStatus] = useState<SubFilter>("live");
  const list = usePaged((page) => financeApi.subscriptions({ page, limit: 20, status }), [status]);
  return (
    <>
      <div className="toolbar">
        <Chips<SubFilter> value={status} onChange={setStatus} options={[
          { value: "live", label: t("Live") },
          { value: "expiring", label: t("Expiring soon") },
          { value: "trial", label: t("Trial") },
          { value: "active", label: t("Active") },
          { value: "cancelled", label: t("Cancelled") },
          { value: "expired", label: t("Expired") },
          { value: "all", label: t("All") },
        ]} />
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<Layers size={28} />} title={t("No subscriptions found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Agency")}</th><th>{t("Plan")}</th><th>{t("Status")}</th>
                  <th>{t("Period")}</th><th className="hide-mobile">{t("Source")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((s) => (
                  <tr key={s.id}>
                    <td><div className="cell-title">{s.agencyName || "—"}</div>{s.note && <div className="cell-sub">{s.note}</div>}</td>
                    <td><b>{s.plan?.name}</b><div className="tiny muted">{money(s.plan?.price)} / {t(s.plan?.billingPeriod === "yearly" ? "year" : "month")}</div></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td className="small">{date(s.currentPeriodStart, lang)} → <b>{date(s.currentPeriodEnd, lang)}</b></td>
                    <td className="hide-mobile small muted">{t(titleCase(s.source))}</td>
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

function PaymentsTab() {
  const t = useT();
  const { lang } = useLang();
  const [agency, setAgency] = useState<Agency | null>(null);
  const agencyId = agency?.id;
  const list = usePaged((page) => financeApi.payments({ page, limit: 20, agencyId }), [agencyId]);
  return (
    <>
      <div className="toolbar"><AgencyPicker value={agency} onChange={setAgency} /></div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<CreditCard size={28} />} title={t("No payments yet")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Agency")}</th><th>{t("Plan")}</th><th className="right">{t("Amount")}</th>
                  <th>{t("Status")}</th><th className="hide-mobile">{t("Method")}</th><th>{t("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-title">{p.agencyName || "—"}</td>
                    <td>{p.planName || p.planCode || "—"}<div className="tiny muted">{t("{0} months", [p.periodMonths])}</div></td>
                    <td className="right bold">{money(p.amount)}</td>
                    <td>
                      <StatusBadge status={p.status} />
                      {p.isMock && <> <Badge color="var(--text-2)">{t("Test")}</Badge></>}
                      {p.failureReason && <div className="tiny text-error">{p.failureReason}</div>}
                    </td>
                    <td className="hide-mobile small">
                      {p.method ? t(titleCase(p.method)) : "—"}
                      {p.razorpayPaymentId && <div className="tiny muted mono">{p.razorpayPaymentId}</div>}
                    </td>
                    <td className="small muted">{dateTime(p.paidAt || p.createdAt, lang)}</td>
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

const limitText = (v: number | null | undefined, t: T) =>
  v == null || v < 0 ? t("Unlimited") : num(v);

function PlansTab() {
  const t = useT();
  const plans = useAsync(() => financeApi.plans(), []);
  const [edit, setEdit] = useState<SubscriptionPlan | "new" | null>(null);
  const list = [...(plans.data || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <>
      {edit && <PlanModal plan={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); plans.reload(true); }} />}
      <div className="toolbar">
        <div className="grow small muted">{t("Plans agencies can buy from the app. Plan code cannot be changed later.")}</div>
        <button className="btn" onClick={() => setEdit("new")}><Plus size={16} />{t("New plan")}</button>
      </div>
      <AsyncBlock loading={plans.loading} error={plans.error} onRetry={() => plans.reload()}
        empty={!list.length && <Empty icon={<Layers size={28} />} title={t("No plans yet")} />}>
        <div className="grid grid-3">
          {list.map((p) => (
            <div key={p.id} className="card" style={{ opacity: p.isActive ? 1 : 0.6 }}>
              <div className="card-head">
                <div className="grow">
                  <h2>{p.name}</h2>
                  <div className="tiny muted mono">{p.code}</div>
                </div>
                {p.isActive ? <StatusBadge status="active" /> : <Badge color="var(--text-2)">{t("Inactive")}</Badge>}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Poppins" }}>
                {p.price > 0 ? money(p.price) : t("Free")}
                {p.price > 0 && <span className="small muted"> / {t(p.billingPeriod === "yearly" ? "year" : "month")}</span>}
              </div>
              {p.description && <p className="small muted">{p.description}</p>}
              <div className="kv-list mt">
                <div><span className="muted">{t("Max drivers")}</span><b>{limitText(p.maxDrivers, t)}</b></div>
                <div><span className="muted">{t("Duties / month")}</span><b>{limitText(p.maxDutiesPerMonth, t)}</b></div>
                <div><span className="muted">{t("Trial days")}</span><b>{num(p.trialDays)}</b></div>
              </div>
              <div className="row wrap mt" style={{ gap: 6 }}>
                {FEATURES.filter((f) => p.features?.[f.key]).map((f) => <Badge key={f.key} color="var(--teal)">{t(f.label)}</Badge>)}
              </div>
              <button className="btn outline block mt" onClick={() => setEdit(p)}><Pencil size={14} />{t("Edit")}</button>
            </div>
          ))}
        </div>
      </AsyncBlock>
    </>
  );
}

function PlanModal({ plan, onClose, onSaved }: { plan: SubscriptionPlan | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [f, setF] = useState({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    price: String(plan?.price ?? 0),
    billingPeriod: plan?.billingPeriod ?? "monthly",
    maxDrivers: plan?.maxDrivers == null ? "-1" : String(plan.maxDrivers),
    maxDutiesPerMonth: plan?.maxDutiesPerMonth == null ? "-1" : String(plan.maxDutiesPerMonth),
    trialDays: String(plan?.trialDays ?? 0),
    sortOrder: String(plan?.sortOrder ?? 0),
    isActive: plan?.isActive ?? true,
    features: { ...(plan?.features || {}) } as Record<string, boolean>,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const valid = f.code.trim() && f.name.trim() && !Number.isNaN(Number(f.price));

  const save = async () => {
    const body: PlanBody = {
      code: f.code.trim().toLowerCase(),
      name: f.name.trim(),
      description: f.description.trim(),
      price: Number(f.price) || 0,
      billingPeriod: f.billingPeriod,
      maxDrivers: parseInt(f.maxDrivers || "-1", 10),
      maxDutiesPerMonth: parseInt(f.maxDutiesPerMonth || "-1", 10),
      trialDays: parseInt(f.trialDays || "0", 10),
      sortOrder: parseInt(f.sortOrder || "0", 10),
      isActive: f.isActive,
      features: Object.fromEntries(FEATURES.map((x) => [x.key, !!f.features[x.key]])),
    };
    const ok = await run(() => (plan ? financeApi.updatePlan(plan.id, body) : financeApi.createPlan(body)),
      plan ? t("Plan updated") : t("Plan created"));
    if (ok) onSaved();
  };

  return (
    <Modal wide title={plan ? t("Edit plan") : t("New plan")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || !valid} onClick={save}>{t("Save")}</button>
      </>
    }>
      <div className="form-grid">
        <Field label={t("Plan code")} hint={plan ? t("Code cannot be changed") : t("Lowercase, e.g. pro_monthly")}>
          <input className="input mono" disabled={!!plan} value={f.code} onChange={(e) => set("code", e.target.value)} />
        </Field>
        <Field label={t("Plan name")}><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label={t("Price (₹)")}><input className="input" type="number" min={0} value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label={t("Billing period")}>
          <select className="select" value={f.billingPeriod} onChange={(e) => set("billingPeriod", e.target.value)}>
            <option value="monthly">{t("Monthly")}</option>
            <option value="yearly">{t("Yearly")}</option>
          </select>
        </Field>
        <Field label={t("Max drivers")} hint={t("-1 = unlimited")}>
          <input className="input" type="number" value={f.maxDrivers} onChange={(e) => set("maxDrivers", e.target.value)} />
        </Field>
        <Field label={t("Duties per month")} hint={t("-1 = unlimited")}>
          <input className="input" type="number" value={f.maxDutiesPerMonth} onChange={(e) => set("maxDutiesPerMonth", e.target.value)} />
        </Field>
        <Field label={t("Trial days")}><input className="input" type="number" min={0} value={f.trialDays} onChange={(e) => set("trialDays", e.target.value)} /></Field>
        <Field label={t("Sort order")}><input className="input" type="number" value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} /></Field>
      </div>
      <Field label={t("Description")}>
        <textarea className="textarea" value={f.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="field">
        <label>{t("Features")}</label>
        {FEATURES.map((x) => (
          <div key={x.key} className="row between" style={{ padding: "6px 0" }}>
            <span>{t(x.label)}</span>
            <Switch checked={!!f.features[x.key]} onChange={(v) => set("features", { ...f.features, [x.key]: v })} />
          </div>
        ))}
      </div>
      <div className="row between" style={{ padding: "6px 0" }}>
        <b>{t("Active (visible to agencies)")}</b>
        <Switch checked={f.isActive} onChange={(v) => set("isActive", v)} />
      </div>
    </Modal>
  );
}
