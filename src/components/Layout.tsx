import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AppWindow, BadgeIndianRupee, Bolt, Building2, Bus, Car, FileCheck2, KeyRound, LayoutDashboard, LifeBuoy,
  LogOut, Megaphone, MessageSquareWarning, Settings, ShieldCheck, SlidersHorizontal, Store, Truck, UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { authApi } from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { useLang, useT } from "../i18n";
import { useAction } from "../hooks/useAction";
import { Field, Modal } from "./ui";

interface NavItem {
  path: string;
  label: string;
  sub: string;
  icon: LucideIcon;
  section: "main" | "ops" | "tools" | "system";
  bottom?: boolean;
}

/** Mobile admin app ke 5 tabs + quick actions, web ke hisaab se */
export const NAV: NavItem[] = [
  { path: "/", label: "Dashboard", sub: "Platform overview", icon: LayoutDashboard, section: "main", bottom: true },
  { path: "/agencies", label: "Agencies", sub: "Approve, block and manage agencies", icon: Building2, section: "main", bottom: true },
  { path: "/drivers", label: "Drivers", sub: "All drivers across the platform", icon: Car, section: "main", bottom: true },
  { path: "/duties", label: "Duties", sub: "Monitor and control every duty", icon: Truck, section: "main", bottom: true },
  { path: "/market", label: "Duty Market", sub: "Duties drivers & agencies post for each other · Groups", icon: Store, section: "main" },
  { path: "/financial", label: "Financial", sub: "Subscriptions · Payments · Plans", icon: BadgeIndianRupee, section: "main", bottom: true },
  { path: "/documents", label: "Documents", sub: "KYC verification queue", icon: FileCheck2, section: "ops" },
  { path: "/support", label: "Support Tickets", sub: "Help requests from drivers and agencies", icon: LifeBuoy, section: "ops" },
  { path: "/complaints", label: "Complaints", sub: "Complaints against drivers and agencies", icon: MessageSquareWarning, section: "ops" },
  { path: "/broadcast", label: "Broadcast", sub: "Send notifications to users", icon: Megaphone, section: "ops" },
  { path: "/users", label: "Users & Impersonation", sub: "View the app as any user", icon: UserCog, section: "tools" },
  { path: "/security", label: "Security Center", sub: "Logs · Devices · Force logout", icon: ShieldCheck, section: "tools" },
  { path: "/permissions", label: "Permissions", sub: "Control role-based access", icon: SlidersHorizontal, section: "tools" },
  { path: "/vehicle-types", label: "Vehicle Types", sub: "Sedan, SUV, Tempo Traveller…", icon: Bus, section: "system" },
  { path: "/app-versions", label: "App Versions", sub: "Updates and force update", icon: AppWindow, section: "system" },
  { path: "/settings", label: "Settings", sub: "System settings and jobs", icon: Settings, section: "system" },
  { path: "/activity", label: "Activity Log", sub: "Recent platform activity", icon: Activity, section: "system" },
];

const SECTIONS: { key: NavItem["section"]; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "ops", label: "Operations" },
  { key: "tools", label: "Admin Tools" },
  { key: "system", label: "System" },
];

export function LangToggle({ dark }: { dark?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-toggle ${dark ? "dark" : ""}`}>
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
      <button className={lang === "hi" ? "on" : ""} onClick={() => setLang("hi")}>हिं</button>
    </div>
  );
}

/** Mobile app ka amber "Super Admin Tools" button */
function ToolsMenu() {
  const t = useT();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const tools = [
    { path: "/users", icon: UserCog, title: "Impersonate User", sub: "Login as any driver/agency", color: "var(--primary)" },
    { path: "/security", icon: ShieldCheck, title: "Security Center", sub: "Logs, devices, force logout", color: "var(--error)" },
    { path: "/permissions", icon: SlidersHorizontal, title: "Permissions", sub: "Control role access", color: "var(--purple)" },
    { path: "/broadcast", icon: Megaphone, title: "Broadcast", sub: "Notify drivers and agencies", color: "var(--teal)" },
  ];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="btn cta sm" onClick={() => setOpen((o) => !o)}>
        <Bolt size={16} />
        <span className="hide-mobile">{t("Tools")}</span>
      </button>
      {open && (
        <div className="tools-menu">
          <div className="row" style={{ padding: "4px 6px 10px" }}>
            <div className="tool-icon" style={{ background: "var(--grad-amber-orange)", width: 30, height: 30 }}><Bolt size={16} /></div>
            <h3>{t("Super Admin Tools")}</h3>
          </div>
          {tools.map((x) => (
            <div key={x.path} className="tool-item" onClick={() => { setOpen(false); nav(x.path); }}>
              <div className="tool-icon" style={{ background: x.color }}><x.icon size={18} /></div>
              <div>
                <div className="bold">{t(x.title)}</div>
                <div className="small muted">{t(x.sub)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { run, busy } = useAction();
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const err = newP && newP.length < 6 ? t("At least 6 characters") : confirm && confirm !== newP ? t("Passwords do not match") : "";
  return (
    <Modal
      title={t("Change password")}
      onClose={onClose}
      footer={
        <>
          <button className="btn outline" onClick={onClose}>{t("Cancel")}</button>
          <button
            className="btn"
            disabled={busy || !oldP || newP.length < 6 || newP !== confirm}
            onClick={async () => {
              if (await run(() => authApi.changePassword(oldP, newP), t("Password changed"))) onClose();
            }}
          >
            {t("Save")}
          </button>
        </>
      }
    >
      <Field label={t("Old password")}><input className="input" type="password" value={oldP} onChange={(e) => setOldP(e.target.value)} /></Field>
      <Field label={t("New password")}><input className="input" type="password" value={newP} onChange={(e) => setNewP(e.target.value)} /></Field>
      <Field label={t("Confirm new password")}><input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
      {err && <div className="small text-error">{err}</div>}
    </Modal>
  );
}

export default function Layout() {
  const t = useT();
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [pwOpen, setPwOpen] = useState(false);

  const current = NAV.find((n) => (n.path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(n.path))) ?? NAV[0];

  useEffect(() => {
    document.title = `${t(current.label)} · DutyLink Admin`;
  }, [current, t]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><Truck size={18} /></div>
          <div>
            <div className="brand-name">DutyLink</div>
            <div className="brand-sub">{t("Super Admin Panel")}</div>
          </div>
        </div>
        <nav className="nav">
          {SECTIONS.map((s) => (
            <div key={s.key}>
              <div className="nav-section">{t(s.label)}</div>
              {NAV.filter((n) => n.section === s.key).map((n) => (
                <NavLink key={n.path} to={n.path} end={n.path === "/"}>
                  <n.icon size={18} />
                  {t(n.label)}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid var(--border)", padding: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <div className="avatar">{(user?.name || "A").slice(0, 1).toUpperCase()}</div>
            <div className="grow">
              <div className="bold ellipsis">{user?.name}</div>
              <div className="tiny muted">{user?.phone_number}</div>
            </div>
          </div>
          <div className="row">
            <button className="btn sm outline grow" onClick={() => setPwOpen(true)}><KeyRound size={14} />{t("Password")}</button>
            <button className="btn sm danger-outline grow" onClick={logout}><LogOut size={14} />{t("Logout")}</button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="grow" style={{ minWidth: 0 }}>
            <h1 className="ellipsis">{t(current.label)}</h1>
            <div className="sub ellipsis hide-mobile">{t(current.sub)}</div>
          </div>
          <LangToggle />
          <ToolsMenu />
          <button className="icon-btn show-mobile" title={t("Logout")} onClick={logout}><LogOut size={18} /></button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {NAV.filter((n) => n.bottom).map((n) => (
          <NavLink key={n.path} to={n.path} end={n.path === "/"}>
            <n.icon size={20} />
            {t(n.label)}
          </NavLink>
        ))}
      </nav>
      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}
    </div>
  );
}
