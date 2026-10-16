import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { supportApi } from "../api/api";
import type { Complaint } from "../api/types";
import { usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, statusLabel, titleCase } from "../lib/format";
import { AsyncBlock, Badge, Chips, Empty, Field, InfoRow, Modal, Pager, StatusBadge } from "../components/ui";

type CFilter = "" | "open" | "investigating" | "resolved" | "dismissed";
type Against = "" | "driver" | "agency";

export default function Complaints() {
  const t = useT();
  const { lang } = useLang();
  const [status, setStatus] = useState<CFilter>("open");
  const [against, setAgainst] = useState<Against>("");
  const list = usePaged((page) => supportApi.complaints({ page, limit: 20, status, againstType: against }), [status, against]);
  const [open, setOpen] = useState<Complaint | null>(null);

  return (
    <>
      {open && <ComplaintModal c={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload(true); }} />}
      <div className="toolbar">
        <Chips<CFilter> value={status} onChange={setStatus} options={[
          { value: "open", label: t("Open") },
          { value: "investigating", label: t("Investigating") },
          { value: "resolved", label: t("Resolved") },
          { value: "dismissed", label: t("Dismissed") },
          { value: "", label: t("All") },
        ]} />
        <select className="select" value={against} onChange={(e) => setAgainst(e.target.value as Against)}>
          <option value="">{t("Against anyone")}</option>
          <option value="driver">{t("Against drivers")}</option>
          <option value="agency">{t("Against agencies")}</option>
        </select>
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<MessageSquareWarning size={28} />} title={t("No complaints found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Complaint")}</th><th>{t("Against")}</th><th className="hide-mobile">{t("By")}</th>
                  <th>{t("Status")}</th><th className="hide-mobile">{t("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => setOpen(c)}>
                    <td>
                      <div className="cell-title">{t(titleCase(c.category))}</div>
                      <div className="cell-sub ellipsis" style={{ maxWidth: 320 }}>{c.description}</div>
                    </td>
                    <td>
                      <div>{c.againstName || "—"}</div>
                      <Badge color={c.againstType === "agency" ? "var(--primary)" : "var(--teal)"}>{statusLabel(c.againstType, t)}</Badge>
                    </td>
                    <td className="hide-mobile">
                      <div>{c.complainantName || "—"}</div>
                      {c.complainantRole && <div className="tiny muted">{statusLabel(c.complainantRole, t)}</div>}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="hide-mobile small muted">{dateTime(c.createdAt, lang)}</td>
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

function ComplaintModal({ c, onClose, onSaved }: { c: Complaint; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const { run, busy } = useAction();
  const [status, setStatus] = useState<string>(c.status);
  const [resolution, setResolution] = useState(c.resolution || "");
  const needsResolution = status === "resolved" || status === "dismissed";
  const valid = !needsResolution || resolution.trim().length > 0;

  return (
    <Modal wide title={t("Complaint details")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Close")}</button>
        <button className="btn" disabled={busy || !valid || (status === c.status && resolution === (c.resolution || ""))} onClick={async () => {
          if (await run(() => supportApi.updateComplaint(c.id, status, resolution.trim()), t("Complaint updated"))) onSaved();
        }}>{t("Save")}</button>
      </>
    }>
      <InfoRow k={t("Category")} v={t(titleCase(c.category))} />
      <InfoRow k={t("Against")} v={<>{c.againstName || "—"} <Badge>{statusLabel(c.againstType, t)}</Badge></>} />
      <InfoRow k={t("By")} v={<>{c.complainantName || "—"} {c.complainantRole && <Badge color="var(--text-2)">{statusLabel(c.complainantRole, t)}</Badge>}</>} />
      {c.dutyId && <InfoRow k={t("Duty ID")} v={<span className="mono">{c.dutyId}</span>} />}
      <InfoRow k={t("Filed")} v={dateTime(c.createdAt, lang)} />
      {c.resolvedAt && <InfoRow k={t("Resolved at")} v={dateTime(c.resolvedAt, lang)} />}
      <div className="card mt" style={{ background: "var(--bg)" }}>
        <div className="small bold mb">{t("Description")}</div>
        <div style={{ whiteSpace: "pre-wrap" }}>{c.description}</div>
        {c.attachmentUrls?.length ? (
          <div className="row wrap mt">
            {c.attachmentUrls.map((u, i) => <a key={u} href={u} target="_blank" rel="noreferrer" className="small">{t("Attachment {0}", [i + 1])}</a>)}
          </div>
        ) : null}
      </div>
      <Field label={t("Status")}>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["open", "investigating", "resolved", "dismissed"].map((s) => <option key={s} value={s}>{statusLabel(s, t)}</option>)}
        </select>
      </Field>
      <Field label={t("Resolution")} hint={needsResolution ? t("Required when resolving or dismissing") : undefined}>
        <textarea className="textarea" value={resolution} onChange={(e) => setResolution(e.target.value)} />
      </Field>
    </Modal>
  );
}
