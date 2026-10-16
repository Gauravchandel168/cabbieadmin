import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity, BadgeIndianRupee, Building2, Car, CheckCircle2, Clock, Hourglass, MapPin, ShieldOff, Trophy, Truck, Users,
} from "lucide-react";
import { agencyApi, dashboardApi, financeApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, longDate, money, num, timeAgo, titleCase, weekdayShort } from "../lib/format";
import { AsyncBlock, Avatar, Empty, ErrorBox, Loading, StatCard, useConfirm } from "../components/ui";

export default function Dashboard() {
  const t = useT();
  const { lang } = useLang();
  const nav = useNavigate();
  const { run } = useAction();
  const { confirm, confirmNode } = useConfirm();

  const dash = useAsync(() => dashboardApi.enhanced(), []);
  const analytics = useAsync(() => dashboardApi.analytics(), []);
  const revenue = useAsync(() => financeApi.revenue(), []);
  const pending = useAsync(() => agencyApi.list({ status: "pending", limit: 6, sortBy: "createdAt", sortOrder: "desc" }), []);

  const s = dash.data?.stats;
  const a = analytics.data;
  const refreshPending = () => { pending.reload(true); dash.reload(true); };

  return (
    <>
      {confirmNode}
      <div className="hero mb">
        <div>
          <div className="small" style={{ opacity: 0.85 }}>{longDate(lang)}</div>
          <h1>{t("Super Admin Panel")}</h1>
          <div className="muted small">{t("Platform Highlights")}</div>
        </div>
        <div className="hero-stats">
          <div><div className="v">{s ? num(s.totalUsers) : "—"}</div><div className="l">{t("Users")}</div></div>
          <div><div className="v">{a ? `${Math.round(a.acceptanceRate)}%` : "—"}</div><div className="l">{t("Acceptance Rate")}</div></div>
          <div><div className="v">{revenue.data ? money(revenue.data.thisMonth) : "—"}</div><div className="l">{t("Revenue this month")}</div></div>
        </div>
      </div>

      {dash.error && <div className="mb"><ErrorBox message={dash.error} onRetry={() => dash.reload()} /></div>}

      <div className="grid grid-4 mb">
        <StatCard icon={<Building2 size={20} />} label={t("Agencies")} value={s ? num(s.totalAgencies) : "—"}
          caption={s ? t("{0} approved", [s.approvedAgencies]) : undefined} onClick={() => nav("/agencies")} />
        <StatCard icon={<Hourglass size={20} />} color="var(--warning)" label={t("Pending Approvals")}
          value={s ? num(s.pendingAgencies) : "—"} onClick={() => nav("/agencies?status=pending")} />
        <StatCard icon={<Car size={20} />} color="var(--teal)" label={t("Drivers")} value={s ? num(s.totalDrivers) : "—"}
          caption={s ? t("{0} verified", [s.verifiedDrivers]) : undefined} onClick={() => nav("/drivers")} />
        <StatCard icon={<Truck size={20} />} color="var(--orange)" label={t("Live duties")}
          value={a ? num(a.openDuties + a.acceptedDuties + a.ongoingDuties) : s ? num(s.openDuties) : "—"}
          caption={s ? t("{0} total", [num(s.totalDuties)]) : undefined} onClick={() => nav("/duties")} />
      </div>

      <div className="grid grid-main">
        <div>
          <div className="card">
            <div className="card-head">
              <h2>{t("Weekly Duty Trend")}</h2>
              <span className="small muted">{t("Total duties posted per day")}</span>
            </div>
            {analytics.loading ? <Loading /> : analytics.error ? <ErrorBox message={analytics.error} onRetry={() => analytics.reload()} /> : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={(a?.weeklyTrend || []).map((d) => ({ ...d, day: weekdayShort(d.date, lang) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="posted" name={t("Posted")} fill="#2563eb" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name={t("Completed")} fill="#14b8a6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-4 mt">
            <StatCard icon={<CheckCircle2 size={20} />} color="var(--success)" label={t("Completed")} value={a ? num(a.completedDuties) : "—"} />
            <StatCard icon={<Clock size={20} />} color="var(--info)" label={t("Open")} value={a ? num(a.openDuties) : "—"} />
            <StatCard icon={<ShieldOff size={20} />} color="var(--error)" label={t("Cancelled")} value={a ? num(a.cancelledDuties) : "—"} />
            <StatCard icon={<BadgeIndianRupee size={20} />} color="var(--success)" label={t("Trip revenue")} value={a ? money(a.revenue) : "—"} />
          </div>

          <div className="card mt">
            <div className="card-head">
              <Activity size={18} className="text-primary" />
              <h2>{t("Recent Activity")}</h2>
              <div className="actions"><button className="btn sm ghost" onClick={() => nav("/activity")}>{t("See all")}</button></div>
            </div>
            <AsyncBlock loading={dash.loading} error={dash.error} onRetry={() => dash.reload()}
              empty={!dash.data?.recentActivities?.length && <Empty title={t("No activity yet")} />}>
              <div className="timeline">
                {(dash.data?.recentActivities || []).map((x) => (
                  <div className="item" key={x.id}>
                    <div className="row between">
                      <span className="bold">{x.actorName || t("System")}</span>
                      <span className="tiny muted">{timeAgo(x.createdAt, t)}</span>
                    </div>
                    <div className="small muted">
                      {titleCase(x.action)}{x.entity ? ` · ${titleCase(x.entity)}` : ""}{x.details ? ` — ${x.details}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </AsyncBlock>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-head">
              <Hourglass size={18} className="text-warning" />
              <h2>{t("Pending Approvals")}</h2>
              <div className="actions"><button className="btn sm ghost" onClick={() => nav("/agencies?status=pending")}>{t("See all")}</button></div>
            </div>
            <AsyncBlock loading={pending.loading} error={pending.error} onRetry={() => pending.reload()}
              empty={!pending.data?.items.length && <Empty icon={<CheckCircle2 size={28} />} title={t("All caught up!")} sub={t("No agencies waiting for approval")} />}>
              {pending.data?.items.map((ag) => (
                <div key={ag.id} className="row" style={{ padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
                  <Avatar name={ag.name} />
                  <div className="grow">
                    <div className="bold ellipsis">{ag.name}</div>
                    <div className="tiny muted ellipsis">{[ag.ownerName, ag.ownerPhone || ag.phoneNumber, ag.city].filter(Boolean).join(" • ")}</div>
                    <div className="tiny muted">{dateTime(ag.createdAt, lang)}</div>
                  </div>
                  <button className="btn sm success" onClick={async () => {
                    if (await run(() => agencyApi.approve(ag.id))) refreshPending();
                  }}>{t("Approve")}</button>
                  <button className="btn sm danger-outline" onClick={() => confirm({
                    title: t("Reject {0}?", [ag.name]), danger: true, askReason: true, confirmLabel: t("Reject"),
                    onConfirm: async (reason) => { await agencyApi.block(ag.id, reason); refreshPending(); },
                  })}>{t("Reject")}</button>
                </div>
              ))}
            </AsyncBlock>
          </div>

          <div className="card">
            <div className="card-head">
              <BadgeIndianRupee size={18} className="text-success" />
              <h2>{t("Revenue")}</h2>
              <div className="actions"><button className="btn sm ghost" onClick={() => nav("/financial")}>{t("Details")}</button></div>
            </div>
            <AsyncBlock loading={revenue.loading} error={revenue.error} onRetry={() => revenue.reload()}>
              {revenue.data && (
                <div className="kv-list">
                  <div><span className="muted">{t("This month")}</span><b>{money(revenue.data.thisMonth)}</b></div>
                  <div><span className="muted">{t("Last month")}</span><b>{money(revenue.data.lastMonth)}</b></div>
                  <div><span className="muted">MRR</span><b>{money(revenue.data.mrr)}</b></div>
                  <div><span className="muted">{t("Paid agencies")}</span><b>{num(revenue.data.activePaid)}</b></div>
                  <div><span className="muted">{t("On trial")}</span><b>{num(revenue.data.activeTrials)}</b></div>
                  <div><span className="muted">{t("Expiring in 7 days")}</span><b className="text-warning">{num(revenue.data.expiringIn7Days)}</b></div>
                </div>
              )}
            </AsyncBlock>
          </div>

          <div className="card">
            <div className="card-head"><Trophy size={18} className="text-warning" /><h2>{t("Most Active Drivers")}</h2></div>
            {a?.topDrivers?.length ? a.topDrivers.map((d, i) => (
              <div key={d.name + i} className="row" style={{ padding: "6px 0" }}>
                <Avatar name={d.name} />
                <span className="grow bold">{d.name}</span>
                <span className="small muted">{t("{0} trips", [d.duties])}</span>
              </div>
            )) : <div className="small muted">{t("No data yet")}</div>}
          </div>

          <div className="card">
            <div className="card-head"><MapPin size={18} className="text-primary" /><h2>{t("Popular routes")}</h2></div>
            {a?.popularRoutes?.length ? a.popularRoutes.map((r, i) => (
              <div key={i} className="row between" style={{ padding: "6px 0" }}>
                <span>{r.fromLocation} → {r.toLocation}</span>
                <b>{r.count}</b>
              </div>
            )) : <div className="small muted">{t("No data yet")}</div>}
          </div>

          <div className="card">
            <div className="card-head"><Users size={18} className="text-primary" /><h2>{t("Platform")}</h2></div>
            {s ? (
              <div className="kv-list">
                <div><span className="muted">{t("Approved agencies")}</span><b>{num(s.approvedAgencies)}</b></div>
                <div><span className="muted">{t("Blocked agencies")}</span><b className="text-error">{num(s.blockedAgencies)}</b></div>
                <div><span className="muted">{t("Verified drivers")}</span><b>{num(s.verifiedDrivers)}</b></div>
                <div><span className="muted">{t("Blocked drivers")}</span><b className="text-error">{num(s.blockedDrivers)}</b></div>
                <div><span className="muted">{t("Open duties")}</span><b>{num(s.openDuties)}</b></div>
              </div>
            ) : <Loading />}
          </div>
        </div>
      </div>
    </>
  );
}
