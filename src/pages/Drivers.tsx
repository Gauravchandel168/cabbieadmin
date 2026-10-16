import { useState } from "react";
import { Ban, BadgeCheck, Car, GitMerge, KeyRound, LogOut, MapPin, Star, Unlock, UserCog } from "lucide-react";
import { driverApi, userApi } from "../api/api";
import type { Driver } from "../api/types";
import { useDebounced, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { date, dateTime, regNo, timeAgo } from "../lib/format";
import {
  AsyncBlock, Avatar, Badge, Chips, Drawer, Empty, Field, InfoRow, Modal, Pager, SearchBox, StatusBadge, useConfirm,
} from "../components/ui";
import { ResetPasswordModal, useImpersonate } from "./Users";

type StatusFilter = "" | "active" | "blocked" | "verified" | "unverified";

export default function Drivers() {
  const t = useT();
  const [status, setStatus] = useState<StatusFilter>("");
  const [availability, setAvailability] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const q = useDebounced(search);
  const c = useDebounced(city);
  const [open, setOpen] = useState<Driver | null>(null);

  const list = usePaged(
    (page) => driverApi.list({ page, limit: 20, status, availability, city: c, search: q, sortBy }),
    [status, availability, c, q, sortBy],
  );

  return (
    <>
      <div className="toolbar">
        <Chips<StatusFilter> value={status} onChange={setStatus} options={[
          { value: "", label: t("All Drivers") },
          { value: "active", label: t("Active") },
          { value: "blocked", label: t("Blocked") },
          { value: "verified", label: t("Verified") },
          { value: "unverified", label: t("Unverified") },
        ]} />
      </div>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search drivers by name or phone")} />
        <input className="input" style={{ maxWidth: 160 }} value={city} placeholder={t("City")} onChange={(e) => setCity(e.target.value)} />
        <select className="select" value={availability} onChange={(e) => setAvailability(e.target.value)}>
          <option value="">{t("Any availability")}</option>
          <option value="available">{t("Available")}</option>
          <option value="busy">{t("Busy")}</option>
          <option value="offline">{t("Offline")}</option>
        </select>
        <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="createdAt">{t("Newest first")}</option>
          <option value="name">{t("Name")}</option>
          <option value="rating">{t("Rating")}</option>
          <option value="duties">{t("Most trips")}</option>
        </select>
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<Car size={28} />} title={t("No drivers found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Driver")}</th>
                  <th className="hide-mobile">{t("City")}</th>
                  <th>{t("Rating")}</th>
                  <th>{t("Trips")}</th>
                  <th>{t("Availability")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((d) => (
                  <tr key={d.id} className="clickable" onClick={() => setOpen(d)}>
                    <td>
                      <div className="row">
                        <Avatar name={d.name} />
                        <div>
                          <div className="cell-title">{d.name} {d.isVerified && <BadgeCheck size={14} className="text-primary" style={{ verticalAlign: -2 }} />}</div>
                          <div className="cell-sub">{d.phoneNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">{d.city || "—"}</td>
                    <td>{d.rating > 0 ? <span><Star size={13} className="text-warning" style={{ verticalAlign: -2 }} /> {d.rating.toFixed(1)}</span> : "—"}</td>
                    <td>{d.totalCompletedDuties}</td>
                    <td><StatusBadge status={d.availability} /></td>
                    <td><StatusBadge status={d.isBlocked ? "blocked" : "active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager pagination={list.pagination} page={list.page} onPage={list.goTo} />
        </AsyncBlock>
      </div>

      {open && <DriverDrawer driver={open} onClose={() => setOpen(null)} onChanged={() => list.reload(true)} />}
    </>
  );
}

function DriverDrawer({ driver, onClose, onChanged }: { driver: Driver; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const { run } = useAction();
  const { confirm, confirmNode } = useConfirm();
  const { impersonate, impersonateNode } = useImpersonate();
  const [d, setD] = useState(driver);
  const [resetOpen, setResetOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  const patch = (p: Partial<Driver>) => {
    setD((x) => ({ ...x, ...p }));
    onChanged();
  };

  return (
    <Drawer title={d.name} sub={d.phoneNumber} onClose={onClose}>
      {confirmNode}
      {impersonateNode}
      {resetOpen && <ResetPasswordModal userId={d.userId} name={d.name} onClose={() => setResetOpen(false)} />}
      {merging && <MergeModal primary={d} onClose={() => setMerging(false)} onDone={() => { onChanged(); onClose(); }} />}

      <div className="card">
        <div className="row mb">
          <Avatar name={d.name} size="lg" />
          <div className="grow">
            <h2>{d.name}</h2>
            <div className="row wrap" style={{ marginTop: 4 }}>
              <StatusBadge status={d.isBlocked ? "blocked" : "active"} />
              <StatusBadge status={d.availability} />
              {d.isVerified ? <Badge color="var(--primary)"><BadgeCheck size={12} />{t("Verified")}</Badge> : <Badge color="var(--text-2)">{t("Not verified")}</Badge>}
            </div>
          </div>
        </div>
        {d.isBlocked && d.blockReason && <div className="banner error mb">{t("Reason")}: {d.blockReason}</div>}
        <div className="grid grid-3 mb">
          <div className="stat"><div className="value">{d.rating > 0 ? d.rating.toFixed(1) : "—"}</div><div className="label">{t("Rating ({0})", [d.totalRatings])}</div></div>
          <div className="stat"><div className="value">{d.totalCompletedDuties}</div><div className="label">{t("Trips")}</div></div>
          <div className="stat"><div className="value">{d.experienceYears ?? "—"}</div><div className="label">{t("Years experience")}</div></div>
        </div>
        <InfoRow k={t("Email")} v={d.email} />
        <InfoRow k={t("City")} v={d.city} />
        <InfoRow k={t("Address")} v={d.address} />
        <InfoRow k={t("Date of birth")} v={date(d.dateOfBirth, lang)} />
        <InfoRow k={t("Languages")} v={d.languages?.join(", ")} />
        <InfoRow k={t("Emergency contact")} v={[d.emergencyContactName, d.emergencyContactPhone].filter(Boolean).join(" • ")} />
        <InfoRow k={t("Last location")} v={
          d.lastLat != null && d.lastLng != null ? (
            <a href={`https://www.google.com/maps/search/?api=1&query=${d.lastLat},${d.lastLng}`} target="_blank" rel="noreferrer">
              <MapPin size={13} style={{ verticalAlign: -2 }} /> {timeAgo(d.lastLocationAt, t)}
            </a>
          ) : null
        } />
        <InfoRow k={t("Joined")} v={dateTime(d.createdAt, lang)} />
      </div>

      <div className="card">
        <div className="card-head"><Car size={18} className="text-primary" /><h2>{t("Vehicles")}</h2></div>
        {!d.vehicles?.length ? <div className="small muted">{t("No vehicle")}</div> : d.vehicles.map((v) => (
          <div key={v.id} className="row" style={{ padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
            <div className="grow">
              <div className="bold">{regNo(v.registrationNumber)} {v.isPrimary && <Badge color="var(--success)">{t("Primary")}</Badge>}</div>
              <div className="tiny muted">{[v.vehicleTypeName, v.make, v.model, v.color, v.manufactureYear].filter(Boolean).join(" • ")}</div>
            </div>
            {v.isVerified ? <StatusBadge status="verified" /> : (
              <button className="btn sm outline" onClick={async () => {
                if (await run(() => driverApi.verifyVehicle(v.id))) {
                  patch({ vehicles: d.vehicles?.map((x) => (x.id === v.id ? { ...x, isVerified: true } : x)) });
                }
              }}>{t("Verify")}</button>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="mb">{t("Actions")}</h3>
        <div className="row wrap">
          {!d.isVerified && (
            <button className="btn" onClick={async () => { if (await run(() => driverApi.verify(d.id))) patch({ isVerified: true }); }}>
              <BadgeCheck size={16} />{t("Verify driver")}
            </button>
          )}
          {d.isBlocked ? (
            <button className="btn success" onClick={async () => { if (await run(() => userApi.unblock(d.userId))) patch({ isBlocked: false, blockReason: null }); }}>
              <Unlock size={16} />{t("Unblock")}
            </button>
          ) : (
            <button className="btn danger" onClick={() => confirm({
              title: t("Block {0}?", [d.name]), danger: true, askReason: true, confirmLabel: t("Block"),
              message: t("Platform-wide block: the driver can't log in and won't get any duty."),
              onConfirm: async (reason) => { await userApi.block(d.userId, reason); patch({ isBlocked: true, blockReason: reason }); },
            })}><Ban size={16} />{t("Block")}</button>
          )}
          <button className="btn outline" onClick={() => impersonate(d.userId, d.name)}><UserCog size={16} />{t("Impersonate")}</button>
          <button className="btn outline" onClick={() => setResetOpen(true)}><KeyRound size={16} />{t("Reset password")}</button>
          <button className="btn outline" onClick={() => confirm({
            title: t("Force logout {0}?", [d.name]), message: t("All sessions of this user will be signed out."),
            confirmLabel: t("Force logout"), onConfirm: async () => { await userApi.forceLogout(d.userId); },
          })}><LogOut size={16} />{t("Force logout")}</button>
          <button className="btn outline" onClick={() => setMerging(true)}><GitMerge size={16} />{t("Merge duplicate")}</button>
        </div>
      </div>
    </Drawer>
  );
}

/** Ek driver ke do account → duplicate ka sab primary me */
function MergeModal({ primary, onClose, onDone }: { primary: Driver; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [dup, setDup] = useState<Driver | null>(null);
  const { confirm, confirmNode } = useConfirm();
  const results = usePaged(
    (page) => (q.trim().length >= 3
      ? driverApi.list({ page, limit: 8, search: q })
      : Promise.resolve({ items: [] as Driver[], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } })),
    [q],
  );

  return (
    <Modal wide title={t("Merge duplicate driver")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn danger" disabled={!dup} onClick={() => dup && confirm({
          title: t("Merge {0} into {1}?", [dup.name, primary.name]), danger: true, confirmLabel: t("Merge"),
          message: t("Links, duties, vehicles and documents of the duplicate move to the primary driver, and the duplicate is deleted. This cannot be undone."),
          onConfirm: async () => { await driverApi.merge(primary.id, dup.id); onDone(); onClose(); },
        })}>{t("Merge")}</button>
      </>
    }>
      {confirmNode}
      <div className="banner info mb">{t("Primary (kept)")}: <b>{primary.name}</b> — {primary.phoneNumber}</div>
      <Field label={t("Find the duplicate account")}>
        <SearchBox value={search} onChange={setSearch} placeholder={t("Type at least 3 letters of name / phone")} />
      </Field>
      <AsyncBlock loading={results.loading && q.trim().length >= 3} error={results.error}>
        {results.items.filter((x) => x.id !== primary.id).map((x) => (
          <div key={x.id} className="tool-item" style={{ border: dup?.id === x.id ? "1px solid var(--primary)" : "1px solid transparent" }}
            onClick={() => setDup(x)}>
            <Avatar name={x.name} />
            <div className="grow">
              <div className="bold">{x.name}</div>
              <div className="tiny muted">{x.phoneNumber} • {t("{0} trips", [x.totalCompletedDuties])}</div>
            </div>
            {dup?.id === x.id && <Badge>{t("Selected")}</Badge>}
          </div>
        ))}
      </AsyncBlock>
    </Modal>
  );
}
