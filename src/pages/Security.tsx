import { useState } from "react";
import { History, LogOut, MonitorSmartphone } from "lucide-react";
import { securityApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useLang, useT } from "../i18n";
import { dateTime, statusLabel, timeAgo } from "../lib/format";
import { AsyncBlock, Avatar, Badge, Empty, StatusBadge, useConfirm } from "../components/ui";

type Tab = "logs" | "devices";
const ONLINE_MS = 15 * 60 * 1000;

export default function Security() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("logs");
  return (
    <>
      <div className="tabs">
        <button className={`tab ${tab === "logs" ? "active" : ""}`} onClick={() => setTab("logs")}>{t("Activity Logs")}</button>
        <button className={`tab ${tab === "devices" ? "active" : ""}`} onClick={() => setTab("devices")}>{t("Active Devices")}</button>
      </div>
      {tab === "logs" ? <Logs /> : <Devices />}
    </>
  );
}

function Logs() {
  const t = useT();
  const { lang } = useLang();
  const logs = useAsync(() => securityApi.logs(), []);
  const items = logs.data || [];
  return (
    <div className="card flush">
      <AsyncBlock loading={logs.loading} error={logs.error} onRetry={() => logs.reload()}
        empty={!items.length && <Empty icon={<History size={28} />} title={t("No login activity yet")} />}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t("User")}</th><th>{t("Result")}</th><th className="hide-mobile">{t("Device")}</th><th className="hide-mobile">{t("IP address")}</th><th>{t("Time")}</th></tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="cell-title">{l.userName || "—"}</div>
                    {l.userRole && <div className="cell-sub">{statusLabel(l.userRole, t)}</div>}
                  </td>
                  <td>{l.success === false ? <StatusBadge status="failed" label={t("Failed")} /> : <StatusBadge status="success" label={t("Success")} />}</td>
                  <td className="hide-mobile small">{l.device || "—"}{l.location && <div className="tiny muted">{l.location}</div>}</td>
                  <td className="hide-mobile mono">{l.ipAddress || "—"}</td>
                  <td className="small muted" title={dateTime(l.createdAt, lang)}>{timeAgo(l.createdAt, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncBlock>
    </div>
  );
}

function Devices() {
  const t = useT();
  const { lang } = useLang();
  const dev = useAsync(() => securityApi.devices(), []);
  const { confirm, confirmNode } = useConfirm();
  const items = dev.data || [];
  const isOnline = (v?: string | null) => !!v && Date.now() - new Date(v).getTime() < ONLINE_MS;
  return (
    <>
      {confirmNode}
      <div className="small muted mb">{t("Online = active in the last 15 minutes.")}</div>
      <div className="card flush">
        <AsyncBlock loading={dev.loading} error={dev.error} onRetry={() => dev.reload()}
          empty={!items.length && <Empty icon={<MonitorSmartphone size={28} />} title={t("No active sessions")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t("User")}</th><th>{t("Device")}</th><th>{t("Last active")}</th><th className="right">{t("Actions")}</th></tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="row">
                        <Avatar name={s.userName} />
                        <div>
                          <div className="cell-title">{s.userName || "—"}</div>
                          {s.userRole && <div className="cell-sub">{statusLabel(s.userRole, t)}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="small">
                      {s.deviceName || t("Unknown device")}
                      {s.platform && <div><Badge color="var(--text-2)">{s.platform}</Badge></div>}
                    </td>
                    <td className="small" title={dateTime(s.lastActiveAt, lang)}>
                      {isOnline(s.lastActiveAt) && <span className="dot" style={{ background: "var(--success)" }} />}
                      {s.lastActiveAt ? timeAgo(s.lastActiveAt, t) : "—"}
                    </td>
                    <td className="right">
                      <button className="btn sm danger-outline" onClick={() => confirm({
                        title: t("Force logout {0}?", [s.userName || ""]), danger: true,
                        message: t("All sessions of this user will be signed out."), confirmLabel: t("Force logout"),
                        onConfirm: async () => { await securityApi.forceLogout(s.userId); dev.reload(true); },
                      })}><LogOut size={14} />{t("Force logout")}</button>
                    </td>
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
