import { useState } from "react";
import { Check, ExternalLink, FileCheck2, X } from "lucide-react";
import { documentApi } from "../api/api";
import { usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { date, dateTime, titleCase } from "../lib/format";
import { AsyncBlock, Avatar, Chips, Empty, Pager, StatusBadge, useConfirm } from "../components/ui";

type Owner = "driver" | "agency";
type DocStatus = "pending" | "verified" | "rejected" | "expired" | "all";

export const DOC_NAMES: Record<string, string> = {
  driving_license: "Driving License",
  aadhaar: "Aadhaar Card",
  aadhar: "Aadhaar Card",
  pan: "PAN Card",
  pan_card: "PAN Card",
  rc: "Registration Certificate (RC)",
  insurance: "Insurance",
  permit: "Permit",
  fitness: "Fitness Certificate",
  puc: "PUC Certificate",
  police_verification: "Police Verification",
  photo: "Photo",
  gst: "GST Certificate",
  gst_certificate: "GST Certificate",
  business_registration: "Business Registration",
  trade_license: "Trade License",
  address_proof: "Address Proof",
  other: "Other",
};

export default function Documents() {
  const t = useT();
  const { lang } = useLang();
  const [owner, setOwner] = useState<Owner>("driver");
  const [status, setStatus] = useState<DocStatus>("pending");
  const list = usePaged((page) => documentApi.list(owner, { page, limit: 20, status }), [owner, status]);
  const { run } = useAction();
  const { confirm, confirmNode } = useConfirm();
  const docName = (k: string) => (DOC_NAMES[k] ? t(DOC_NAMES[k]) : titleCase(k));

  return (
    <>
      {confirmNode}
      <div className="tabs">
        <button className={`tab ${owner === "driver" ? "active" : ""}`} onClick={() => setOwner("driver")}>{t("Driver documents")}</button>
        <button className={`tab ${owner === "agency" ? "active" : ""}`} onClick={() => setOwner("agency")}>{t("Agency documents")}</button>
      </div>
      <div className="toolbar">
        <Chips<DocStatus> value={status} onChange={setStatus} options={[
          { value: "pending", label: t("Pending") },
          { value: "verified", label: t("Verified") },
          { value: "rejected", label: t("Rejected") },
          { value: "expired", label: t("Expired") },
          { value: "all", label: t("All") },
        ]} />
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<FileCheck2 size={28} />}
            title={status === "pending" ? t("All caught up!") : t("No documents found")}
            sub={status === "pending" ? t("No documents waiting for verification") : undefined} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Owner")}</th><th>{t("Document")}</th><th className="hide-mobile">{t("Validity")}</th>
                  <th>{t("Status")}</th><th className="right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="row">
                        <Avatar name={d.ownerName} />
                        <div>
                          <div className="cell-title">{d.ownerName || "—"}</div>
                          <div className="cell-sub">{t("Uploaded {0}", [dateTime(d.createdAt, lang)])}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="bold">{docName(d.documentType)}</div>
                      {d.documentNumber && <div className="tiny muted mono">{d.documentNumber}</div>}
                      {d.fileUrl && (
                        <a className="small" href={d.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink size={12} /> {t("View file")}
                        </a>
                      )}
                    </td>
                    <td className="hide-mobile small">
                      {d.issueDate && <div>{t("Issued")}: {date(d.issueDate, lang)}</div>}
                      {d.expiryDate ? <div>{t("Expires")}: <b>{date(d.expiryDate, lang)}</b></div> : !d.issueDate && "—"}
                    </td>
                    <td>
                      <StatusBadge status={d.verificationStatus} />
                      {d.rejectionReason && <div className="tiny text-error">{d.rejectionReason}</div>}
                    </td>
                    <td>
                      <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                        {d.verificationStatus !== "verified" && (
                          <button className="btn sm success" onClick={async () => {
                            if (await run(() => documentApi.verify(owner, d.id))) list.reload(true);
                          }}><Check size={14} />{t("Verify")}</button>
                        )}
                        {d.verificationStatus !== "rejected" && (
                          <button className="btn sm danger-outline" onClick={() => confirm({
                            title: t("Reject {0}?", [docName(d.documentType)]), danger: true, askReason: true,
                            message: t("The owner will see this reason and can upload again."),
                            confirmLabel: t("Reject"),
                            onConfirm: async (reason) => { await documentApi.reject(owner, d.id, reason); list.reload(true); },
                          })}><X size={14} />{t("Reject")}</button>
                        )}
                      </div>
                    </td>
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
