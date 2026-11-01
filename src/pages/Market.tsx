import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Ban, BellRing, CheckCircle2, ExternalLink, Eye, Hourglass, Lock, MessageCircle, Phone, ShieldCheck, ShieldOff,
  Store, Trash2, TrendingUp, UserCheck, Users, UsersRound, X,
} from "lucide-react";
import { marketApi } from "../api/marketApi";
import type { DutyGroup, MarketDuty } from "../api/marketTypes";
import { useAsync, useDebounced, usePaged } from "../hooks/useAsync";
import { useLang, useT } from "../i18n";
import { dateTime, dutyTypeLabel, money, num, regNo, timeAgo, weekdayShort } from "../lib/format";
import {
  AsyncBlock, Avatar, Badge, Chips, Drawer, Empty, ErrorBox, InfoRow, Loading, Pager, SearchBox, StatCard, StatusBadge,
  useConfirm,
} from "../components/ui";

type Tab = "overview" | "duties" | "groups";

/** Duty Market — drivers / agencies ki aapas ki duties aur groups par nazar */
export default function Market() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const groupId = params.get("groupId") || "";
  const groupName = params.get("groupName") || "";

  const go = (next: Record<string, string>) => setParams(next, { replace: false });

  return (
    <>
      <div className="tabs">
        {([
          ["overview", t("Overview")],
          ["duties", t("Market duties")],
          ["groups", t("Groups")],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => go({ tab: k })}>{l}</button>
        ))}
      </div>
      {tab === "overview" && <Overview onOpen={go} />}
      {tab === "duties" && (
        <DutiesTab
          groupId={groupId}
          groupName={groupName}
          onClearGroup={() => go({ tab: "duties" })}
          initialStatus={params.get("status") || ""}
        />
      )}
      {tab === "groups" && (
        <GroupsTab onSeeDuties={(g) => go({ tab: "duties", groupId: g.id, groupName: g.name })} />
      )}
    </>
  );
}

// ═══════════════════════════════ Overview ═══════════════════════════════

function Overview({ onOpen }: { onOpen: (p: Record<string, string>) => void }) {
  const t = useT();
  const { lang } = useLang();
  const s = useAsync(() => marketApi.stats(), []);
  if (s.loading) return <Loading />;
  if (s.error || !s.data) return <ErrorBox message={s.error || t("Something went wrong")} onRetry={() => s.reload()} />;
  const d = s.data;
  const maxRoute = Math.max(1, ...d.topRoutes.map((r) => r.count));

  return (
    <>
      <div className="grid grid-4 mb">
        <StatCard icon={<Store size={20} />} label={t("Open right now")} value={num(d.openNow)}
          caption={t("{0} posted today", [num(d.postedToday)])} onClick={() => onOpen({ tab: "duties", status: "open" })} />
        <StatCard icon={<CheckCircle2 size={20} />} color="var(--success)" label={t("Booked (7 days)")} value={num(d.booked7Days)}
          caption={t("{0}% of posted duties", [d.bookingRate])} onClick={() => onOpen({ tab: "duties", status: "booked" })} />
        <StatCard icon={<Phone size={20} />} color="var(--teal)" label={t("Calls (7 days)")} value={num(d.calls7Days)}
          caption={t("{0} active posters", [num(d.activePosters7Days)])} />
        <StatCard icon={<Hourglass size={20} />} color="var(--error)" label={t("Expired unbooked (7 days)")} value={num(d.expired7Days)}
          caption={t("Nobody took these")} onClick={() => onOpen({ tab: "duties", status: "expired" })} />
      </div>

      <div className="grid grid-main">
        <div className="card">
          <div className="card-head">
            <h2>{t("Last 7 days")}</h2>
            <span className="small muted">{t("Duties posted vs booked per day")}</span>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={d.daily.map((x) => ({ ...x, day: weekdayShort(x.date, lang) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                <Tooltip />
                <Legend />
                <Bar dataKey="posted" name={t("Posted")} fill="#2563eb" radius={[6, 6, 0, 0]} />
                <Bar dataKey="booked" name={t("Booked")} fill="#14b8a6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ marginTop: 0 }}>
          <div className="card-head"><TrendingUp size={18} className="text-primary" /><h2>{t("Top routes (7 days)")}</h2></div>
          {!d.topRoutes.length ? <div className="small muted">{t("No duties posted yet")}</div> : d.topRoutes.map((r, i) => (
            <div key={i} style={{ padding: "7px 0" }}>
              <div className="row between small">
                <span className="bold ellipsis">{r.fromCity} → {r.toCity || t("Any")}</span>
                <span className="muted">{num(r.count)}</span>
              </div>
              <div style={{ height: 6, background: "var(--border)", borderRadius: 4, marginTop: 4 }}>
                <div style={{ width: `${(r.count / maxRoute) * 100}%`, height: 6, borderRadius: 4, background: "var(--primary)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-3 mt">
        <StatCard icon={<UsersRound size={20} />} color="var(--purple)" label={t("Active groups")} value={num(d.activeGroups)}
          onClick={() => onOpen({ tab: "groups" })} />
        <StatCard icon={<Users size={20} />} color="var(--info)" label={t("Group members")} value={num(d.groupMembers)} />
        <StatCard icon={<BellRing size={20} />} color="var(--warning)" label={t("Active duty alerts")} value={num(d.activeAlerts)} />
      </div>
    </>
  );
}

// ═══════════════════════════════ Duties ═══════════════════════════════

type DutyFilter = "" | "open" | "booked" | "completed" | "cancelled" | "expired";

function DutiesTab({ groupId, groupName, onClearGroup, initialStatus }: {
  groupId: string; groupName: string; onClearGroup: () => void; initialStatus: string;
}) {
  const t = useT();
  const { lang } = useLang();
  const [status, setStatus] = useState<DutyFilter>((initialStatus as DutyFilter) || "");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [open, setOpen] = useState<MarketDuty | null>(null);

  const list = usePaged(
    (page) => marketApi.duties({ page, limit: 20, status, search: q, groupId: groupId || undefined }),
    [status, q, groupId],
  );

  return (
    <>
      <div className="toolbar">
        <Chips<DutyFilter> value={status} onChange={setStatus} options={[
          { value: "", label: t("All") },
          { value: "open", label: t("Open") },
          { value: "booked", label: t("Booked") },
          { value: "completed", label: t("Completed") },
          { value: "cancelled", label: t("Cancelled") },
          { value: "expired", label: t("Expired") },
        ]} />
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search city, poster name / phone or code")} />
        {groupId && (
          <button className="btn sm outline" onClick={onClearGroup} title={t("Remove filter")}>
            <UsersRound size={14} />{groupName || t("Group")}<X size={14} />
          </button>
        )}
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<Store size={28} />} title={t("No market duties found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Route")}</th>
                  <th>{t("Pickup")}</th>
                  <th className="hide-mobile">{t("Posted by")}</th>
                  <th className="hide-mobile right">{t("Calls")}</th>
                  <th>{t("Status")}</th>
                  <th className="right">{t("Driver gets")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => setOpen(d)}>
                    <td>
                      <div className="cell-title">{d.fromCity} → {d.toCity || t("Any")}</div>
                      <div className="cell-sub">
                        {[dutyTypeLabel(d.dutyType, t), d.vehicleTypeName || d.vehicleText, `#${d.shortCode}`].filter(Boolean).join(" • ")}
                      </div>
                    </td>
                    <td className="nowrap small">{dateTime(d.forDate, lang)}</td>
                    <td className="hide-mobile">
                      <div className="cell-title">{d.poster.name}</div>
                      <div className="cell-sub">{d.posterRole === "agency" ? t("Agency") : t("Driver")} • {timeAgo(d.createdAt, t)}</div>
                    </td>
                    <td className="hide-mobile right">{num(d.callCount)}</td>
                    <td>
                      <StatusBadge status={d.status} />
                      {d.removedByAdmin && <div className="tiny text-error">{t("Removed by admin")}</div>}
                    </td>
                    <td className="right bold">{money(d.driverGets)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>

      {open && <MarketDutyDrawer duty={open} onClose={() => setOpen(null)} onChanged={() => list.reload(true)} />}
    </>
  );
}

function MarketDutyDrawer({ duty, onClose, onChanged }: { duty: MarketDuty; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const { confirm, confirmNode } = useConfirm();
  const detail = useAsync(() => marketApi.duty(duty.id), [duty.id]);
  const leads = useAsync(() => marketApi.leads(duty.id), [duty.id]);
  const d = detail.data ?? duty;
  const p = d.poster;
  const canRemove = d.status === "open" || d.status === "booked";

  return (
    <Drawer title={`${d.fromCity} → ${d.toCity || t("Any")}`} sub={`${dateTime(d.forDate, lang)} • #${d.shortCode}`} onClose={onClose}>
      {confirmNode}

      <div className="card">
        <div className="row wrap mb">
          <StatusBadge status={d.status} />
          <StatusBadge status="info" label={dutyTypeLabel(d.dutyType, t)} />
          {(d.vehicleTypeName || d.vehicleText) && <StatusBadge status="info" label={[d.vehicleTypeName, d.vehicleText].filter(Boolean).join(" • ")} />}
          {!d.postToMarket && <Badge color="var(--purple)"><Lock size={12} /> {t("Groups only")}</Badge>}
        </div>
        {d.removedByAdmin && <div className="banner error mb">{t("Removed by admin")}{d.cancelReason ? `: ${d.cancelReason}` : ""}</div>}
        {!d.removedByAdmin && d.status === "cancelled" && d.cancelReason && <div className="banner error mb">{t("Reason")}: {d.cancelReason}</div>}
        <InfoRow k={t("Pickup")} v={d.pickupAddress ? `${d.fromCity} — ${d.pickupAddress}` : d.fromCity} />
        <InfoRow k={t("Drop")} v={d.dropAddress ? `${d.toCity || ""} — ${d.dropAddress}` : d.toCity} />
        {d.distanceKm != null && <InfoRow k={t("Distance")} v={`~${Math.round(d.distanceKm)} km`} />}
        {d.returnDate && <InfoRow k={t("Return")} v={dateTime(d.returnDate, lang)} />}
        {d.passengerCount != null && <InfoRow k={t("Passengers")} v={d.passengerCount} />}
        <InfoRow k={t("Posted in")} v={[d.postToMarket ? t("Duty Market") : null, ...d.groups.map((g) => g.name)].filter(Boolean).join(", ")} />
        <InfoRow k={t("Posted")} v={`${dateTime(d.createdAt, lang)} • ${d.source === "whatsapp_paste" ? t("pasted from WhatsApp") : t("form")}`} />
        {d.notes && <InfoRow k={t("Note")} v={d.notes} />}
      </div>

      <div className="card">
        <h3 className="mb">{t("Posted by")}</h3>
        <div className="row">
          <Avatar name={p.name} />
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="bold row" style={{ gap: 6 }}>
              {p.name}
              {p.isVerified && <ShieldCheck size={14} className="text-success" />}
            </div>
            <div className="small muted">
              {p.role === "agency" ? t("Agency") : t("Driver")}
              {p.ratingCount > 0 && ` • ★ ${p.rating.toFixed(1)} (${p.ratingCount})`}
              {` • ${t("{0} duties posted", [num(p.totalPosted)])}`}
            </div>
          </div>
          {p.phone && <a className="btn sm outline" href={`tel:${p.phone}`}><Phone size={14} />{p.phone}</a>}
        </div>
      </div>

      <div className="card">
        <h3 className="mb">{t("Money")}</h3>
        <InfoRow k={t("Driver gets")} v={<b>{money(d.driverGets)}</b>} />
        <InfoRow k={t("Customer fare")} v={d.customerFare != null ? money(d.customerFare) : null} />
        <InfoRow k={t("Poster's commission")} v={d.commission != null ? <b className="text-success">{money(d.commission)}</b> : null} />
        <InfoRow k={t("Customer")} v={[d.customerName, d.customerPhone].filter(Boolean).join(" • ")} />
        <div className="hint">{t("Customer fare and customer details are private — only the poster and the assigned driver see them.")}</div>
      </div>

      {(d.assignedDriver || d.bookedOutside) && (
        <div className="card">
          <h3 className="mb">{t("Given to")}</h3>
          {d.bookedOutside ? <div className="small">{t("Given to someone outside the app")}</div> : d.assignedDriver && (
            <div className="row">
              <Avatar name={d.assignedDriver.name} />
              <div className="grow">
                <div className="bold">{d.assignedDriver.name}</div>
                <div className="small muted">
                  {[d.assignedDriver.phone, d.assignedDriver.vehicleName, d.assignedDriver.vehicleNo && regNo(d.assignedDriver.vehicleNo)].filter(Boolean).join(" • ")}
                </div>
              </div>
            </div>
          )}
          {d.assignedAt && <InfoRow k={t("Booked at")} v={dateTime(d.assignedAt, lang)} />}
          {d.completedAt && <InfoRow k={t("Completed at")} v={dateTime(d.completedAt, lang)} />}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h2>{t("Interested drivers")}</h2>
          <div className="actions small muted row" style={{ gap: 10 }}>
            <span title={t("Views")}><Eye size={14} /> {num(d.viewCount)}</span>
            <span title={t("Calls")}><Phone size={14} /> {num(d.callCount)}</span>
            <span title={t("I'm free")}><UserCheck size={14} /> {num(d.interestCount)}</span>
          </div>
        </div>
        <AsyncBlock loading={leads.loading} error={leads.error} onRetry={() => leads.reload()}
          empty={!leads.data?.length && <div className="small muted">{t("No driver has called or tapped \"I'm free\" yet")}</div>}>
          {leads.data?.map((l) => (
            <div key={l.id} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <Avatar name={l.driver.name} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="bold ellipsis">
                  {l.driver.name}
                  {d.assignedDriver?.userId === l.driver.userId && <> <Badge color="var(--success)">{t("Got the duty")}</Badge></>}
                </div>
                <div className="tiny muted">
                  {[l.driver.phone, l.driver.vehicleName, l.driver.totalTrips ? t("{0} trips", [l.driver.totalTrips]) : null].filter(Boolean).join(" • ")}
                </div>
                {l.note && <div className="tiny">“{l.note}”</div>}
              </div>
              <div className="right tiny">
                {l.isInterested && <div><Badge color="var(--success)">{t("I'm free")}</Badge></div>}
                {l.callCount > 0 && <div><Phone size={11} /> {l.callCount}</div>}
                {l.whatsappCount > 0 && <div><MessageCircle size={11} /> {l.whatsappCount}</div>}
                <div className="muted">{timeAgo(l.lastCallAt || l.interestedAt || l.createdAt, t)}</div>
              </div>
            </div>
          ))}
        </AsyncBlock>
      </div>

      <div className="card">
        <h3 className="mb">{t("Actions")}</h3>
        <div className="row wrap">
          {d.shareUrl && (
            <a className="btn outline" href={d.shareUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} />{t("Open share page")}</a>
          )}
          {canRemove && (
            <button className="btn danger" onClick={() => confirm({
              title: t("Remove this duty?"), danger: true, askReason: true, confirmLabel: t("Remove"),
              reasonLabel: t("Reason (the poster will see it)"),
              message: t("It disappears from the market and groups. The poster and the assigned driver (if any) are notified."),
              onConfirm: async (reason) => {
                await marketApi.remove(d.id, reason);
                detail.reload(true);
                onChanged();
              },
            })}><Trash2 size={16} />{t("Remove duty")}</button>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ═══════════════════════════════ Groups ═══════════════════════════════

type GroupFilter = "" | "active" | "blocked";

function GroupsTab({ onSeeDuties }: { onSeeDuties: (g: DutyGroup) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [filter, setFilter] = useState<GroupFilter>("");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [open, setOpen] = useState<DutyGroup | null>(null);

  const list = usePaged(
    (page) => marketApi.groups({ page, limit: 20, search: q, blocked: filter === "" ? undefined : filter === "blocked" }),
    [filter, q],
  );

  return (
    <>
      <div className="toolbar">
        <Chips<GroupFilter> value={filter} onChange={setFilter} options={[
          { value: "", label: t("All groups") },
          { value: "active", label: t("Active") },
          { value: "blocked", label: t("Blocked") },
        ]} />
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search group, city or code")} />
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<UsersRound size={28} />} title={t("No groups found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Group")}</th>
                  <th className="hide-mobile">{t("Owner")}</th>
                  <th className="right">{t("Members")}</th>
                  <th className="right hide-mobile">{t("Open duties")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((g) => (
                  <tr key={g.id} className="clickable" onClick={() => setOpen(g)}>
                    <td>
                      <div className="cell-title">{g.name}</div>
                      <div className="cell-sub">
                        {[g.city, g.isPrivate ? t("Private") : t("Open to join"), g.inviteCode].filter(Boolean).join(" • ")}
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div>{g.ownerName || "—"}</div>
                      <div className="cell-sub">{dateTime(g.createdAt, lang)}</div>
                    </td>
                    <td className="right">{num(g.memberCount)}</td>
                    <td className="right hide-mobile">{num(g.openDuties)}</td>
                    <td><GroupStatus g={g} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>

      {open && (
        <GroupDrawer
          group={open}
          onClose={() => setOpen(null)}
          onChanged={(g) => { setOpen(g); list.reload(true); }}
          onSeeDuties={() => onSeeDuties(open)}
        />
      )}
    </>
  );
}

function GroupStatus({ g }: { g: DutyGroup }) {
  const t = useT();
  if (g.blockedByAdmin) return <StatusBadge status="blocked" />;
  if (!g.isActive) return <StatusBadge status="cancelled" label={t("Deleted")} />;
  return <StatusBadge status="active" />;
}

type MemberFilter = "active" | "pending" | "invited";

function GroupDrawer({ group, onClose, onChanged, onSeeDuties }: {
  group: DutyGroup; onClose: () => void; onChanged: (g: DutyGroup) => void; onSeeDuties: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const { confirm, confirmNode } = useConfirm();
  const [mf, setMf] = useState<MemberFilter>("active");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const members = usePaged(
    (page) => marketApi.members(group.id, { page, limit: 20, status: mf, search: q }),
    [group.id, mf, q],
  );
  const g = group;

  return (
    <Drawer title={g.name} sub={[g.city, g.inviteCode].filter(Boolean).join(" • ")} onClose={onClose}>
      {confirmNode}

      <div className="card">
        <div className="row wrap mb">
          <GroupStatus g={g} />
          <StatusBadge status="info" label={g.isPrivate ? t("Private — admin approves joins") : t("Open — anyone with link joins")} />
          <StatusBadge status="info" label={g.whoCanPost === "admins" ? t("Only admins post") : t("All members post")} />
        </div>
        {g.blockedByAdmin && <div className="banner error mb">{t("Blocked")}{g.blockReason ? `: ${g.blockReason}` : ""}</div>}
        {g.description && <p className="small" style={{ marginTop: 0 }}>{g.description}</p>}
        <InfoRow k={t("Owner")} v={g.ownerName} />
        <InfoRow k={t("Members")} v={num(g.memberCount)} />
        <InfoRow k={t("Open duties")} v={num(g.openDuties)} />
        <InfoRow k={t("Join requests")} v={num(g.pendingRequests)} />
        <InfoRow k={t("Created")} v={dateTime(g.createdAt, lang)} />
      </div>

      <div className="card">
        <h3 className="mb">{t("Actions")}</h3>
        <div className="row wrap">
          <button className="btn outline" onClick={onSeeDuties}><Store size={16} />{t("See group duties")}</button>
          {g.isActive && (g.blockedByAdmin ? (
            <button className="btn" onClick={() => confirm({
              title: t("Unblock this group?"), confirmLabel: t("Unblock"),
              message: t("Members can see and post duties in it again."),
              onConfirm: async () => {
                await marketApi.unblock(g.id);
                onChanged({ ...g, blockedByAdmin: false, blockReason: null });
              },
            })}><ShieldCheck size={16} />{t("Unblock group")}</button>
          ) : (
            <button className="btn danger" onClick={() => confirm({
              title: t("Block this group?"), danger: true, askReason: true, confirmLabel: t("Block"),
              message: t("Nobody can open it, join it or post in it. Use it for spam or fraud groups."),
              onConfirm: async (reason) => {
                await marketApi.block(g.id, reason);
                onChanged({ ...g, blockedByAdmin: true, blockReason: reason });
              },
            })}><Ban size={16} />{t("Block group")}</button>
          ))}
        </div>
      </div>

      <div className="card flush">
        <div style={{ padding: "12px 16px 0" }}>
          <div className="card-head"><Users size={18} className="text-primary" /><h2>{t("Members")}</h2></div>
          <div className="toolbar">
            <Chips<MemberFilter> value={mf} onChange={setMf} options={[
              { value: "active", label: t("Members") },
              { value: "pending", label: t("Requests") },
              { value: "invited", label: t("Invited") },
            ]} />
          </div>
          <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder={t("Search name or phone")} /></div>
        </div>
        <AsyncBlock loading={members.loading} error={members.error} onRetry={() => members.reload()}
          empty={!members.items.length && <div className="small muted" style={{ padding: 16 }}>{t("Nobody here")}</div>}>
          {members.items.map((m) => (
            <div key={m.userId} className="list-row">
              <Avatar name={m.name} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="bold ellipsis">
                  {m.name}
                  {m.isVerified && <> <ShieldCheck size={13} className="text-success" /></>}
                </div>
                <div className="tiny muted">
                  {[m.phone, m.userRole === "agency" ? t("Agency") : t("Driver"), m.vehicleName].filter(Boolean).join(" • ")}
                  {m.phoneHidden && ` • ${t("phone hidden from members")}`}
                </div>
                <div className="tiny muted">
                  {t("Posted {0} • Took {1}", [m.postedInGroup, m.takenInGroup])}
                  {m.joinedAt && m.status === "active" && ` • ${t("joined {0}", [timeAgo(m.joinedAt, t)])}`}
                </div>
              </div>
              {m.isOwner ? <Badge color="var(--warning)">{t("Owner")}</Badge>
                : m.role === "admin" ? <Badge color="var(--purple)">{t("Admin")}</Badge> : null}
            </div>
          ))}
          <Pager pagination={members.pagination} page={members.page} onPage={members.goTo} />
        </AsyncBlock>
      </div>

      {!g.isActive && <div className="hint mt"><ShieldOff size={14} /> {t("The owner deleted this group.")}</div>}
    </Drawer>
  );
}
