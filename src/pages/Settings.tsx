import { useEffect, useState } from "react";
import { Play, Plus, Save, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { dashboardApi, systemApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useT } from "../i18n";
import { AsyncBlock, Field, Switch, useConfirm } from "../components/ui";

/** Backend me jo keys sach me use hoti hain */
const KNOWN: { key: string; label: string; desc: string; kind: "text" | "number" | "bool" }[] = [
  { key: "public_support_phone", label: "Support phone", desc: "Shown in the apps' Help screen", kind: "text" },
  { key: "public_support_email", label: "Support email", desc: "Shown in the apps' Help screen", kind: "text" },
  { key: "public_support_whatsapp", label: "Support WhatsApp", desc: "WhatsApp number for help", kind: "text" },
  { key: "public_terms_url", label: "Terms URL", desc: "Terms & conditions link", kind: "text" },
  { key: "public_privacy_url", label: "Privacy URL", desc: "Privacy policy link", kind: "text" },
  { key: "priority_window_minutes", label: "Priority window (minutes)", desc: "How long priority drivers see a new duty before everyone else", kind: "number" },
  { key: "market_max_open_posts", label: "Market: max open posts per user", desc: "How many open market duties one driver / agency can have at a time", kind: "number" },
  { key: "market_free_alert_limit", label: "Market: free duty alerts", desc: "How many duty alerts a user can keep switched on for free", kind: "number" },
  { key: "market_post_requires_verified", label: "Market: only verified users can post", desc: "true = unverified drivers / agencies cannot post in the market", kind: "bool" },
  { key: "market_booked_reminder_hours", label: "Market: 'did you give it?' reminder (hours)", desc: "Hours after calls start before asking the poster to mark the duty booked", kind: "number" },
  { key: "public_web_base_url", label: "Share link base URL", desc: "Used in duty / group share links, e.g. https://api.yourdomain.com", kind: "text" },
  { key: "public_play_store_url", label: "Play Store URL", desc: "Share pages send people here to install the app", kind: "text" },
  { key: "require_trip_otp", label: "Require trip OTP", desc: "true = driver must enter the customer's OTP to start a trip", kind: "bool" },
];

export default function Settings() {
  const t = useT();
  const s = useAsync(() => systemApi.settings(), []);
  const { run, busy } = useAction();
  const { confirm, confirmNode } = useConfirm();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => { if (s.data) setVals({ ...s.data }); }, [s.data]);

  const orig = s.data || {};
  const changed = Object.keys(vals).filter((k) => vals[k] !== orig[k]);
  const set = (k: string, v: string) => setVals((x) => ({ ...x, [k]: v }));
  const known = new Set(KNOWN.map((k) => k.key));
  const others = Object.keys(vals).filter((k) => !known.has(k)).sort();

  const save = async () => {
    const body: Record<string, string> = {};
    changed.forEach((k) => { body[k] = vals[k]; });
    if (await run(() => systemApi.saveSettings(body), t("Settings saved"))) s.reload(true);
  };

  return (
    <>
      {confirmNode}
      <AsyncBlock loading={s.loading} error={s.error} onRetry={() => s.reload()}>
        <div className="grid grid-main">
          <div>
            <div className="card">
              <div className="card-head"><SettingsIcon size={18} className="text-primary" /><h2>{t("App settings")}</h2></div>
              {KNOWN.map((k) => (
                <Field key={k.key} label={t(k.label)} hint={t(k.desc)}>
                  {k.kind === "bool" ? (
                    <div className="row"><Switch checked={vals[k.key] === "true"} onChange={(v) => set(k.key, v ? "true" : "false")} />
                      <span className="small muted mono">{k.key}</span></div>
                  ) : (
                    <input className="input" type={k.kind === "number" ? "number" : "text"} value={vals[k.key] ?? ""} onChange={(e) => set(k.key, e.target.value)} />
                  )}
                </Field>
              ))}
            </div>

            <div className="card">
              <div className="card-head"><h2>{t("Other keys")}</h2></div>
              {others.length === 0 && <div className="small muted mb">{t("No other keys")}</div>}
              {others.map((k) => (
                <Field key={k} label={k}>
                  <input className="input" value={vals[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
                </Field>
              ))}
              <div className="row wrap">
                <input className="input mono" style={{ flex: 1, minWidth: 160 }} placeholder={t("new_key")} value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder={t("Value")} value={newVal} onChange={(e) => setNewVal(e.target.value)} />
                <button className="btn outline" disabled={!newKey.trim() || newKey.trim() in vals} onClick={() => {
                  set(newKey.trim(), newVal); setNewKey(""); setNewVal("");
                }}><Plus size={16} />{t("Add")}</button>
              </div>
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              {changed.length > 0 && <button className="btn outline" onClick={() => setVals({ ...orig })}><Trash2 size={16} />{t("Discard")}</button>}
              <button className="btn" disabled={busy || changed.length === 0} onClick={save}>
                <Save size={16} />{changed.length ? t("Save {0} changes", [changed.length]) : t("Save")}
              </button>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-head"><Play size={18} className="text-warning" /><h2>{t("Background jobs")}</h2></div>
              <p className="small muted" style={{ marginTop: 0 }}>
                {t("Jobs run automatically on the server (expire old duties, subscription reminders and renewals). You can also run them right now.")}
              </p>
              <button className="btn cta block" onClick={() => confirm({
                title: t("Run jobs now?"), confirmLabel: t("Run now"),
                message: t("This runs all scheduled background jobs once."),
                onConfirm: async () => { await run(() => dashboardApi.runJobs(), t("Jobs completed")); },
              })}><Play size={16} />{t("Run jobs now")}</button>
            </div>
          </div>
        </div>
      </AsyncBlock>
    </>
  );
}
