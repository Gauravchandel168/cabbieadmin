import { useEffect, useState } from "react";
import { Ban, History, MapPin, Navigation, RefreshCw, RotateCcw, Trash2, Truck } from "lucide-react";
import { dutyApi } from "../api/api";
import type { Agency, Duty } from "../api/types";
import { useAsync, useDebounced, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, dutyTypeLabel, money, regNo, statusColor, statusLabel, timeAgo } from "../lib/format";
import {
  AsyncBlock, Chips, Drawer, Empty, Field, InfoRow, Modal, Pager, SearchBox, StatusBadge, useConfirm,
} from "../components/ui";
import AgencyPicker from "../components/AgencyPicker";

type Filter = "" | "open" | "accepted,reached" | "in_progress" | "completed" | "cancelled" | "expired";

export default function Duties() {
  const t = useT();
  const { lang } = useLang();
  const [status, setStatus] = useState<Filter>("");
  const [agency, setAgency] = useState<Agency | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const q = useDebounced(search);
  const [open, setOpen] = useState<Duty | null>(null);

  const list = usePaged(
    (page) => dutyApi.list({ page, limit: 20, status, agencyId: agency?.id, search: q, fromDate, toDate }),
    [status, agency?.id, q, fromDate, toDate],
  );

  return (
    <>
      <div className="toolbar">
        <Chips<Filter> value={status} onChange={setStatus} options={[
          { value: "", label: t("All Duties") },
          { value: "open", label: t("Pending") },
          { value: "accepted,reached", label: t("Accepted") },
          { value: "in_progress", label: t("On Trip") },
          { value: "completed", label: t("Completed") },
          { value: "cancelled", label: t("Cancelled") },
          { value: "expired", label: t("Expired") },
        ]} />
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search by route (from / to)")} />
        <AgencyPicker value={agency} onChange={setAgency} />
        <input className="input" type="date" style={{ width: 160 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} title={t("From date")} />
        <input className="input" type="date" style={{ width: 160 }} value={toDate} onChange={(e) => setToDate(e.target.value)} title={t("To date")} />
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<Truck size={28} />} title={t("No duties found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Route")}</th>
                  <th>{t("When")}</th>
                  <th className="hide-mobile">{t("Agency")}</th>
                  <th className="hide-mobile">{t("Driver")}</th>
                  <th>{t("Status")}</th>
                  <th className="right">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => setOpen(d)}>
                    <td>
                      <div className="cell-title">{d.fromLocation} → {d.toLocation}</div>
                      <div className="cell-sub">{[dutyTypeLabel(d.dutyType, t), d.vehicleTypeName].filter(Boolean).join(" • ")}</div>
                    </td>
                    <td className="nowrap small">{dateTime(d.forDate, lang)}</td>
                    <td className="hide-mobile">{d.agencyName || "—"}</td>
                    <td className="hide-mobile">{d.acceptedDriverName || <span className="muted">—</span>}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="right bold">{money(d.finalAmount ?? d.fareAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>

      {open && <DutyDrawer duty={open} onClose={() => setOpen(null)} onChanged={() => list.reload(true)} />}
    </>
  );
}

function DutyDrawer({ duty, onClose, onChanged }: { duty: Duty; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const { confirm, confirmNode } = useConfirm();
  const detail = useAsync(() => dutyApi.get(duty.id), [duty.id]);
  const history = useAsync(() => dutyApi.history(duty.id), [duty.id]);
  const [billing, setBilling] = useState(false);
  const d = detail.data ?? duty;

  const refresh = () => {
    detail.reload(true);
    history.reload(true);
    onChanged();
  };
  const active = d.status === "accepted" || d.status === "reached" || d.status === "in_progress";
  const canReopen = d.status === "accepted" || d.status === "reached" || d.status === "cancelled" || d.status === "expired";

  return (
    <Drawer title={`${d.fromLocation} → ${d.toLocation}`} sub={dateTime(d.forDate, lang)} onClose={onClose}>
      {confirmNode}
      {billing && <BillingModal duty={d} onClose={() => setBilling(false)} onDone={refresh} />}

      <div className="card">
        <div className="row wrap mb">
          <StatusBadge status={d.status} />
          {d.dutyType && <StatusBadge status="info" label={dutyTypeLabel(d.dutyType, t)} />}
          {d.vehicleTypeName && <StatusBadge status="info" label={d.vehicleTypeName} />}
        </div>
        {d.status === "cancelled" && d.cancelReason && <div className="banner error mb">{t("Reason")}: {d.cancelReason}</div>}
        <InfoRow k={t("Agency")} v={d.agencyName} />
        {d.executingAgencyId && d.executingAgencyId !== d.agencyId && <InfoRow k={t("Shared")} v={t("Running with a partner agency")} />}
        <InfoRow k={t("Pickup")} v={d.pickupAddress || d.fromLocation} />
        <InfoRow k={t("Drop")} v={d.dropAddress || d.toLocation} />
        <InfoRow k={t("Customer")} v={[d.customerName, d.customerPhone].filter(Boolean).join(" • ")} />
        <InfoRow k={t("Driver")} v={d.acceptedDriverName ? `${d.acceptedDriverName}${d.acceptedDriverPhone ? ` • ${d.acceptedDriverPhone}` : ""}` : null} />
        {d.acceptedVehicleNo && <InfoRow k={t("Vehicle")} v={regNo(d.acceptedVehicleNo)} />}
        {d.tripOtp && <InfoRow k={t("Trip OTP")} v={<span className="mono bold">{d.tripOtp}</span>} />}
        {d.details && <InfoRow k={t("Note")} v={d.details} />}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t("Money")}</h2>
          {d.status === "completed" && <div className="actions"><button className="btn sm outline" onClick={() => setBilling(true)}>{t("Edit billing")}</button></div>}
        </div>
        <InfoRow k={t("Customer fare")} v={d.fareType === "per_km" ? `${money(d.ratePerKm)}/km` : money(d.fareAmount)} />
        <InfoRow k={t("Driver payout")} v={money(d.driverPayoutAmount)} />
        {d.status === "completed" && (
          <>
            <InfoRow k={t("Total KM")} v={d.totalKm != null ? `${d.totalKm.toFixed(1)} km` : null} />
            <InfoRow k={t("Toll / parking")} v={money((d.tollAmount || 0) + (d.parkingAmount || 0))} />
            <InfoRow k={t("Final bill")} v={<b className="text-success">{money(d.finalAmount)}</b>} />
            <InfoRow k={t("Payment")} v={<StatusBadge status={d.paymentStatus} />} />
          </>
        )}
      </div>

      {active && <TrackCard dutyId={d.id} />}

      <div className="card">
        <div className="card-head"><History size={18} className="text-primary" /><h2>{t("Timeline")}</h2></div>
        <AsyncBlock loading={history.loading} error={history.error} onRetry={() => history.reload()}
          empty={!history.data?.length && <div className="small muted">{t("No history")}</div>}>
          <div className="timeline">
            {history.data?.map((h, i) => (
              <div key={i} className="item" style={{ ["--dot" as string]: statusColor(h.toStatus) }}>
                <div className="row between">
                  <b>{statusLabel(h.toStatus, t)}</b>
                  <span className="tiny muted">{dateTime(h.createdAt, lang)}</span>
                </div>
                {h.note && <div className="small muted">{h.note}</div>}
              </div>
            ))}
          </div>
        </AsyncBlock>
      </div>

      <div className="card">
        <h3 className="mb">{t("Actions")}</h3>
        <div className="row wrap">
          {canReopen && (
            <button className="btn outline" onClick={() => confirm({
              title: t("Reopen to Pending?"),
              message: t("The driver (if any) is removed and the duty is shown to drivers again."),
              confirmLabel: t("Reopen"),
              onConfirm: async () => { await dutyApi.reopen(d.id); refresh(); },
            })}><RotateCcw size={16} />{t("Reopen to Pending")}</button>
          )}
          {(d.status === "open" || active) && (
            <button className="btn danger" onClick={() => confirm({
              title: t("Cancel Duty"), danger: true, askReason: true, confirmLabel: t("Cancel Duty"),
              message: d.status === "in_progress" ? t("This trip is running. The driver will be informed.") : undefined,
              onConfirm: async (reason) => { await dutyApi.cancel(d.id, reason); refresh(); },
            })}><Ban size={16} />{t("Cancel Duty")}</button>
          )}
          <button className="btn danger-outline" onClick={() => confirm({
            title: t("Force Delete"), danger: true, confirmLabel: t("Delete"),
            message: t("The duty is removed from every list. This cannot be undone."),
            onConfirm: async () => { await dutyApi.remove(d.id); onChanged(); onClose(); },
          })}><Trash2 size={16} />{t("Force Delete")}</button>
        </div>
      </div>
    </Drawer>
  );
}

/** Live: aakhri location, 20 sec me taaza */
function TrackCard({ dutyId }: { dutyId: string }) {
  const t = useT();
  const track = useAsync(() => dutyApi.track(dutyId), [dutyId]);
  const { reload } = track;
  useEffect(() => {
    const id = setInterval(() => reload(true), 20000);
    return () => clearInterval(id);
  }, [reload]);
  const p = track.data?.latest;
  const stale = p?.recordedAt ? Date.now() - new Date(p.recordedAt).getTime() > 3 * 60 * 1000 : false;
  return (
    <div className="card">
      <div className="card-head">
        <Navigation size={18} className="text-primary" />
        <h2>{t("Live tracking")}</h2>
        <div className="actions"><button className="icon-btn" onClick={() => reload()} aria-label="refresh"><RefreshCw size={16} /></button></div>
      </div>
      <AsyncBlock loading={track.loading} error={track.error} onRetry={() => reload()}>
        {!p ? <div className="small muted">{t("No location yet. It appears once the driver's app is open.")}</div> : (
          <>
            <InfoRow k={t("Last update")} v={timeAgo(p.recordedAt, t)} />
            {p.speedKmph != null && <InfoRow k={t("Speed")} v={`${Math.round(p.speedKmph)} km/h`} />}
            <InfoRow k={t("Points")} v={track.data?.points?.length ?? 0} />
            {stale && <div className="banner warning mb">{t("No location for a while — the driver's network / app may be off.")}</div>}
            <a className="btn block" href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">
              <MapPin size={16} />{t("View in Google Maps")}
            </a>
          </>
        )}
      </AsyncBlock>
    </div>
  );
}

function BillingModal({ duty, onClose, onDone }: { duty: Duty; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [finalAmount, setFinal] = useState(String(duty.finalAmount ?? ""));
  const [payout, setPayout] = useState(String(duty.driverPayoutAmount ?? ""));
  const [payment, setPayment] = useState(duty.paymentStatus || "unpaid");
  return (
    <Modal title={t("Edit billing")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy} onClick={async () => {
          const r = await run(() => dutyApi.billing(duty.id, {
            finalAmount: finalAmount === "" ? undefined : Number(finalAmount),
            driverPayoutAmount: payout === "" ? undefined : Number(payout),
            paymentStatus: payment,
          }), t("Billing updated"));
          if (r) { onDone(); onClose(); }
        }}>{t("Save")}</button>
      </>
    }>
      <div className="form-grid">
        <Field label={t("Final bill ₹")}><input className="input" type="number" min={0} value={finalAmount} onChange={(e) => setFinal(e.target.value)} /></Field>
        <Field label={t("Driver payout ₹")}><input className="input" type="number" min={0} value={payout} onChange={(e) => setPayout(e.target.value)} /></Field>
      </div>
      <Field label={t("Payment")}>
        <Chips value={payment} onChange={setPayment} options={[
          { value: "unpaid", label: t("Unpaid") },
          { value: "partial", label: t("Partly paid") },
          { value: "paid", label: t("Paid") },
        ]} />
      </Field>
      <div className="hint">{t("The agency's ledger updates automatically.")}</div>
    </Modal>
  );
}
