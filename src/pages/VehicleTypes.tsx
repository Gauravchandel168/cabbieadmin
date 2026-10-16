import { useState } from "react";
import { Bus, Pencil, Plus } from "lucide-react";
import { systemApi, type VehicleTypeBody } from "../api/api";
import type { VehicleType } from "../api/types";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useT } from "../i18n";
import { AsyncBlock, Badge, Empty, Field, Modal, StatusBadge, Switch } from "../components/ui";

export default function VehicleTypes() {
  const t = useT();
  const list = useAsync(() => systemApi.vehicleTypes(), []);
  const [edit, setEdit] = useState<VehicleType | "new" | null>(null);
  const items = [...(list.data || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {edit && <VehicleTypeModal vt={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(true); }} />}
      <div className="toolbar">
        <div className="grow small muted">{t("Vehicle types agencies can choose when posting a duty.")}</div>
        <button className="btn" onClick={() => setEdit("new")}><Plus size={16} />{t("Add vehicle type")}</button>
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!items.length && <Empty icon={<Bus size={28} />} title={t("No vehicle types yet")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t("Name")}</th><th>{t("Code")}</th><th>{t("Seats")}</th><th>{t("Order")}</th><th>{t("Status")}</th><th className="right">{t("Actions")}</th></tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td className="cell-title">{v.name}</td>
                    <td className="mono">{v.code}</td>
                    <td>{v.seatingCapacity ?? "—"}</td>
                    <td>{v.sortOrder}</td>
                    <td>{v.isActive ? <StatusBadge status="active" /> : <Badge color="var(--text-2)">{t("Inactive")}</Badge>}</td>
                    <td className="right"><button className="btn sm outline" onClick={() => setEdit(v)}><Pencil size={14} />{t("Edit")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
      </div>
    </>
  );
}

function VehicleTypeModal({ vt, onClose, onSaved }: { vt: VehicleType | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [code, setCode] = useState(vt?.code ?? "");
  const [name, setName] = useState(vt?.name ?? "");
  const [seats, setSeats] = useState(vt?.seatingCapacity != null ? String(vt.seatingCapacity) : "");
  const [order, setOrder] = useState(String(vt?.sortOrder ?? 0));
  const [active, setActive] = useState(vt?.isActive ?? true);
  const valid = code.trim() && name.trim();

  const save = async () => {
    const body: VehicleTypeBody = {
      code: code.trim().toLowerCase(),
      name: name.trim(),
      seatingCapacity: seats ? parseInt(seats, 10) : undefined,
      sortOrder: parseInt(order || "0", 10),
      isActive: active,
    };
    const ok = await run(() => (vt ? systemApi.updateVehicleType(vt.id, body) : systemApi.createVehicleType(body)),
      vt ? t("Vehicle type updated") : t("Vehicle type added"));
    if (ok) onSaved();
  };

  return (
    <Modal title={vt ? t("Edit vehicle type") : t("Add vehicle type")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || !valid} onClick={save}>{t("Save")}</button>
      </>
    }>
      <div className="form-grid">
        <Field label={t("Name")}><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sedan" /></Field>
        <Field label={t("Code")} hint={t("Lowercase, e.g. sedan")}><input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="sedan" /></Field>
        <Field label={t("Seats")}><input className="input" type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} /></Field>
        <Field label={t("Sort order")}><input className="input" type="number" value={order} onChange={(e) => setOrder(e.target.value)} /></Field>
      </div>
      <div className="row between"><b>{t("Active")}</b><Switch checked={active} onChange={setActive} /></div>
    </Modal>
  );
}
