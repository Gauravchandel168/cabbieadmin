import { useState } from "react";
import { AppWindow, Plus } from "lucide-react";
import { systemApi } from "../api/api";
import { useAsync } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime } from "../lib/format";
import { AsyncBlock, Badge, Chips, Empty, Field, Modal, Switch } from "../components/ui";

type Platform = "" | "android" | "ios";

export default function AppVersions() {
  const t = useT();
  const { lang } = useLang();
  const [platform, setPlatform] = useState<Platform>("");
  const list = useAsync(() => systemApi.appVersions(platform || undefined), [platform]);
  const { run } = useAction();
  const [adding, setAdding] = useState(false);
  const items = list.data || [];

  return (
    <>
      {adding && <PublishModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); list.reload(true); }} />}
      <div className="banner info mb">
        <AppWindow size={18} />
        <div>{t("Apps check the latest active version on start. Users below the minimum supported code are forced to update.")}</div>
      </div>
      <div className="toolbar">
        <Chips<Platform> value={platform} onChange={setPlatform} options={[
          { value: "", label: t("All") },
          { value: "android", label: "Android" },
          { value: "ios", label: "iOS" },
        ]} />
        <div className="grow" />
        <button className="btn" onClick={() => setAdding(true)}><Plus size={16} />{t("Publish version")}</button>
      </div>
      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!items.length && <Empty icon={<AppWindow size={28} />} title={t("No versions published yet")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("Version")}</th><th>{t("Platform")}</th><th>{t("Min supported")}</th>
                  <th className="hide-mobile">{t("Release notes")}</th><th className="hide-mobile">{t("Published")}</th><th>{t("Active")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id}>
                    <td><div className="cell-title">{v.versionName}</div><div className="cell-sub">{t("Code {0}", [v.versionCode])}</div></td>
                    <td><Badge color={v.platform === "ios" ? "var(--text-2)" : "var(--success)"}>{v.platform === "ios" ? "iOS" : "Android"}</Badge></td>
                    <td>{v.minSupportedCode}</td>
                    <td className="hide-mobile small" style={{ maxWidth: 300, whiteSpace: "pre-wrap" }}>
                      {v.releaseNotes || "—"}
                      {v.storeUrl && <div><a href={v.storeUrl} target="_blank" rel="noreferrer" className="tiny">{t("Store link")}</a></div>}
                    </td>
                    <td className="hide-mobile small muted">{dateTime(v.createdAt, lang)}</td>
                    <td>
                      <Switch checked={v.isActive} onChange={async (val) => {
                        if (await run(() => systemApi.setAppVersionActive(v.id, val))) list.reload(true);
                      }} />
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

function PublishModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [platform, setPlatform] = useState<"android" | "ios">("android");
  const [versionName, setVersionName] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [minCode, setMinCode] = useState("");
  const [notes, setNotes] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const code = parseInt(versionCode, 10);
  const min = parseInt(minCode, 10);
  const valid = versionName.trim() && code > 0 && min > 0 && min <= code;

  return (
    <Modal title={t("Publish version")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || !valid} onClick={async () => {
          const ok = await run(() => systemApi.createAppVersion({
            platform, versionCode: code, versionName: versionName.trim(), minSupportedCode: min,
            releaseNotes: notes.trim() || undefined, storeUrl: storeUrl.trim() || undefined,
          }), t("Version published"));
          if (ok) onSaved();
        }}>{t("Publish")}</button>
      </>
    }>
      <Field label={t("Platform")}>
        <Chips<"android" | "ios"> value={platform} onChange={setPlatform} options={[
          { value: "android", label: "Android" }, { value: "ios", label: "iOS" },
        ]} />
      </Field>
      <div className="form-grid">
        <Field label={t("Version name")}><input className="input" value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="1.2.0" /></Field>
        <Field label={t("Version code")}><input className="input" type="number" min={1} value={versionCode} onChange={(e) => setVersionCode(e.target.value)} placeholder="12" /></Field>
      </div>
      <Field label={t("Minimum supported code")} hint={t("Users on a lower code must update. Must be ≤ version code.")}>
        <input className="input" type="number" min={1} value={minCode} onChange={(e) => setMinCode(e.target.value)} />
      </Field>
      <Field label={t("Release notes")}><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label={t("Store URL")}><input className="input" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" /></Field>
    </Modal>
  );
}
