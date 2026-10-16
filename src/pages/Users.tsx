import { useState } from "react";
import { Ban, Copy, KeyRound, LogOut, Unlock, UserCog, Users as UsersIcon } from "lucide-react";
import { userApi } from "../api/api";
import { errorMessage } from "../api/client";
import type { AdminUser, ImpersonateResponse } from "../api/types";
import { useDebounced, usePaged } from "../hooks/useAsync";
import { useAction } from "../hooks/useAction";
import { useLang, useT } from "../i18n";
import { dateTime, statusLabel, timeAgo } from "../lib/format";
import {
  AsyncBlock, Avatar, Badge, Chips, Empty, Field, InfoRow, Modal, Pager, SearchBox, StatusBadge, useConfirm, useToast,
} from "../components/ui";

export function ResetPasswordModal({ userId, name, onClose }: { userId: string; name: string; onClose: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [pw, setPw] = useState("");
  return (
    <Modal title={t("Reset password")} onClose={onClose} footer={
      <>
        <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
        <button className="btn" disabled={busy || pw.length < 6} onClick={async () => {
          if (await run(() => userApi.resetPassword(userId, pw), t("Password reset for {0}", [name]))) onClose();
        }}>{t("Set password")}</button>
      </>
    }>
      <p className="muted" style={{ marginTop: 0 }}>{t("Set a new password for {0}. Share it with them securely.", [name])}</p>
      <Field label={t("New password")} hint={t("At least 6 characters")}>
        <input className="input" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
      </Field>
    </Modal>
  );
}

/** Impersonation: token lo, dikhao, session band karo */
export function useImpersonate() {
  const toast = useToast();
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [session, setSession] = useState<(ImpersonateResponse & { name: string }) | null>(null);
  const impersonate = async (userId: string, name: string) => {
    setBusyFor(userId);
    try {
      const res = await userApi.impersonate(userId);
      setSession({ ...res.data, name });
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyFor(null);
    }
  };
  const node = session ? <ImpersonationModal session={session} onClose={() => setSession(null)} /> : null;
  return { impersonate, impersonateNode: node, impersonatingId: busyFor };
}

function ImpersonationModal({ session, onClose }: { session: ImpersonateResponse & { name: string }; onClose: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { run, busy } = useAction();
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t("Copied"), "success");
    } catch {
      toast(t("Could not copy"), "error");
    }
  };
  return (
    <Modal wide title={<span className="row"><UserCog size={20} className="text-primary" />{t("Impersonation Mode")}</span>} onClose={onClose} footer={
      <>
        <button className="btn danger-outline" disabled={busy} onClick={async () => {
          if (await run(() => userApi.endImpersonation(session.sessionId), t("Impersonation session ended"))) onClose();
        }}>{t("End session")}</button>
        <button className="btn" onClick={onClose}>{t("Done")}</button>
      </>
    }>
      <div className="banner warning mb">
        {t("You are viewing as {0}. Changing passwords, payments and logging out are blocked with this token. The token expires in 30 minutes.", [session.name])}
      </div>
      <InfoRow k={t("User")} v={session.name} />
      <InfoRow k={t("Session ID")} v={<span className="mono">{session.sessionId}</span>} />
      <InfoRow k={t("Expires at")} v={dateTime(session.expiresAt, lang)} />
      {session.agencyId && <InfoRow k={t("Agency ID")} v={<span className="mono">{session.agencyId}</span>} />}
      {session.driverId && <InfoRow k={t("Driver ID")} v={<span className="mono">{session.driverId}</span>} />}
      <Field label={t("Access token")} hint={t("Use it as 'Authorization: Bearer <token>' in the mobile app (debug build) or API tools to see exactly what this user sees.")}>
        <div className="row">
          <input className="input mono" readOnly value={session.accessToken} onFocus={(e) => e.target.select()} />
          <button className="btn outline" onClick={() => copy(session.accessToken)}><Copy size={16} />{t("Copy")}</button>
        </div>
      </Field>
    </Modal>
  );
}

type RoleFilter = "" | "driver" | "agency" | "super_admin";

export default function Users() {
  const t = useT();
  const { lang } = useLang();
  const [role, setRole] = useState<RoleFilter>("driver");
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const list = usePaged((page) => userApi.list({ page, limit: 20, role, search: q }), [role, q]);
  const { run } = useAction();
  const { confirm, confirmNode } = useConfirm();
  const { impersonate, impersonateNode, impersonatingId } = useImpersonate();
  const [reset, setReset] = useState<AdminUser | null>(null);

  return (
    <>
      {confirmNode}
      {impersonateNode}
      {reset && <ResetPasswordModal userId={reset.id} name={reset.name} onClose={() => setReset(null)} />}

      <div className="banner info mb">
        <UserCog size={18} />
        <div>
          <b>{t("View app as any user")}</b>
          <div className="small">{t("No data is modified during impersonation.")}</div>
        </div>
      </div>

      <div className="toolbar">
        <Chips<RoleFilter> value={role} onChange={setRole} options={[
          { value: "driver", label: t("Drivers") },
          { value: "agency", label: t("Agencies") },
          { value: "super_admin", label: t("Admins") },
          { value: "", label: t("All") },
        ]} />
        <SearchBox value={search} onChange={setSearch} placeholder={t("Search by name, phone, agency...")} />
      </div>

      <div className="card flush">
        <AsyncBlock loading={list.loading} error={list.error} onRetry={() => list.reload()}
          empty={!list.items.length && <Empty icon={<UsersIcon size={28} />} title={t("No users found")} />}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("User")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Status")}</th>
                  <th className="hide-mobile">{t("Last login")}</th>
                  <th className="right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <Avatar name={u.name} />
                        <div>
                          <div className="cell-title">{u.name}</div>
                          <div className="cell-sub">{u.phoneNumber}{u.email ? ` • ${u.email}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge color={u.role === "super_admin" ? "var(--purple)" : u.role === "agency" ? "var(--primary)" : "var(--teal)"}>
                        {statusLabel(u.role, t)}
                      </Badge>
                    </td>
                    <td>
                      {u.isBlocked ? <StatusBadge status="blocked" /> : u.isApproved ? <StatusBadge status="active" /> : <StatusBadge status="pending" />}
                      {u.isBlocked && u.blockReason && <div className="tiny muted">{u.blockReason}</div>}
                    </td>
                    <td className="hide-mobile small muted" title={dateTime(u.lastLoginAt, lang)}>{u.lastLoginAt ? timeAgo(u.lastLoginAt, t) : "—"}</td>
                    <td>
                      {u.role !== "super_admin" && (
                        <div className="row" style={{ justifyContent: "flex-end", gap: 6 }}>
                          <button className="btn sm" disabled={impersonatingId === u.id} onClick={() => impersonate(u.id, u.name)}>
                            <UserCog size={14} /><span className="hide-mobile">{t("Impersonate")}</span>
                          </button>
                          <button className="btn sm outline" title={t("Reset password")} onClick={() => setReset(u)}><KeyRound size={14} /></button>
                          <button className="btn sm outline" title={t("Force logout")} onClick={() => confirm({
                            title: t("Force logout {0}?", [u.name]), message: t("All sessions of this user will be signed out."),
                            confirmLabel: t("Force logout"), onConfirm: async () => { await userApi.forceLogout(u.id); },
                          })}><LogOut size={14} /></button>
                          {u.isBlocked ? (
                            <button className="btn sm success" title={t("Unblock")} onClick={async () => {
                              if (await run(() => userApi.unblock(u.id))) list.reload(true);
                            }}><Unlock size={14} /></button>
                          ) : (
                            <button className="btn sm danger-outline" title={t("Block")} onClick={() => confirm({
                              title: t("Block {0}?", [u.name]), danger: true, askReason: true, confirmLabel: t("Block"),
                              message: t("They won't be able to log in. Existing sessions end when their token expires (max ~60 min)."),
                              onConfirm: async (reason) => { await userApi.block(u.id, reason); list.reload(true); },
                            })}><Ban size={14} /></button>
                          )}
                        </div>
                      )}
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
