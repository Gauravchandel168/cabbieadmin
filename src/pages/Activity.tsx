import { useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import { dashboardApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useLang, useT } from "../i18n";
import { dateTime, timeAgo, titleCase } from "../lib/format";
import { AsyncBlock, Avatar, Empty, SearchBox } from "../components/ui";

export default function Activity() {
  const t = useT();
  const { lang } = useLang();
  const a = useAsync(() => dashboardApi.activities(), []);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const items = (a.data || []).filter((x) =>
    !q || [x.actorName, x.action, x.entity, x.details].some((v) => (v || "").toLowerCase().includes(q)));

  return (
    <>
      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder={t("Filter by name, action or details...")} />
        <button className="btn outline" onClick={() => a.reload()}>{t("Refresh")}</button>
      </div>
      <div className="card">
        <AsyncBlock loading={a.loading} error={a.error} onRetry={() => a.reload()}
          empty={!items.length && <Empty icon={<ActivityIcon size={28} />} title={t("No activity yet")} />}>
          {items.map((x) => (
            <div key={x.id} className="row" style={{ padding: "10px 0", borderBottom: "1px dashed var(--border)", alignItems: "flex-start" }}>
              <Avatar name={x.actorName || "S"} />
              <div className="grow">
                <div className="row between">
                  <span className="bold">{x.actorName || t("System")}</span>
                  <span className="tiny muted" title={dateTime(x.createdAt, lang)}>{timeAgo(x.createdAt, t)}</span>
                </div>
                <div className="small">
                  {titleCase(x.action)}{x.entity ? ` · ${titleCase(x.entity)}` : ""}
                </div>
                {x.details && <div className="small muted">{x.details}</div>}
              </div>
            </div>
          ))}
        </AsyncBlock>
      </div>
    </>
  );
}
