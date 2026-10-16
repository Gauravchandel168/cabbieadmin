import { useEffect, useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { securityApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useT } from "../i18n";
import { AsyncBlock, Switch } from "../components/ui";

type Role = "agency" | "driver";

const GROUPS: Record<Role, { title: string; items: { key: string; label: string; sub: string }[] }[]> = {
  agency: [
    {
      title: "Duties",
      items: [
        { key: "canPostDuty", label: "Post duty", sub: "Create new duties" },
        { key: "canEditDuty", label: "Edit duty", sub: "Change open duties" },
        { key: "canCancelDuty", label: "Cancel duty", sub: "Cancel posted duties" },
      ],
    },
    {
      title: "Drivers",
      items: [
        { key: "canAddDriver", label: "Add driver", sub: "Invite and approve drivers" },
        { key: "canBlockDriver", label: "Block driver", sub: "Block drivers in their network" },
        { key: "canDeleteDriver", label: "Remove driver", sub: "Remove drivers from their network" },
      ],
    },
    {
      title: "Reports",
      items: [
        { key: "canViewAnalytics", label: "View analytics", sub: "Dashboard charts and stats" },
        { key: "canExportData", label: "Export data", sub: "Download reports" },
      ],
    },
  ],
  driver: [
    {
      title: "Duties",
      items: [
        { key: "canAcceptDuty", label: "Accept duty", sub: "Accept open duties" },
        { key: "canViewHistory", label: "View history", sub: "See past trips" },
      ],
    },
    {
      title: "Account",
      items: [
        { key: "canUploadDocuments", label: "Upload documents", sub: "Upload KYC documents" },
        { key: "canViewEarnings", label: "View earnings", sub: "See earnings summary" },
      ],
    },
  ],
};

export default function Permissions() {
  const t = useT();
  const [role, setRole] = useState<Role>("agency");
  const perms = useAsync(() => securityApi.permissions(role), [role]);
  const { run, busy } = useAction();
  const [vals, setVals] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!perms.data) return;
    const p = perms.data.permissions || {};
    const all: Record<string, boolean> = {};
    GROUPS[role].forEach((g) => g.items.forEach((i) => { all[i.key] = p[i.key] ?? true; }));
    setVals(all);
    setSaved(all);
  }, [perms.data, role]);

  const dirty = Object.keys(vals).some((k) => vals[k] !== saved[k]);

  return (
    <>
      <div className="banner warning mb">
        <AlertTriangle size={18} />
        <div>{t("Saved per role on the server. Note: the backend and apps do not enforce these permissions yet — they are stored for upcoming use.")}</div>
      </div>
      <div className="tabs">
        <button className={`tab ${role === "agency" ? "active" : ""}`} onClick={() => setRole("agency")}>{t("Agency")}</button>
        <button className={`tab ${role === "driver" ? "active" : ""}`} onClick={() => setRole("driver")}>{t("Driver")}</button>
      </div>
      <AsyncBlock loading={perms.loading} error={perms.error} onRetry={() => perms.reload()}>
        <div className="grid grid-2">
          {GROUPS[role].map((g) => (
            <div className="card" key={g.title}>
              <div className="card-head"><h2>{t(g.title)}</h2></div>
              {g.items.map((i) => (
                <div key={i.key} className="row between" style={{ padding: "8px 0", borderBottom: "1px dashed var(--border)" }}>
                  <div>
                    <div className="bold">{t(i.label)}</div>
                    <div className="tiny muted">{t(i.sub)}</div>
                  </div>
                  <Switch checked={!!vals[i.key]} onChange={(v) => setVals((x) => ({ ...x, [i.key]: v }))} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {dirty && <button className="btn outline" onClick={() => setVals(saved)}>{t("Reset")}</button>}
          <button className="btn" disabled={busy || !dirty} onClick={async () => {
            if (await run(() => securityApi.savePermissions(role, vals), t("Permissions saved"))) setSaved(vals);
          }}><Save size={16} />{t("Save")}</button>
        </div>
      </AsyncBlock>
    </>
  );
}
