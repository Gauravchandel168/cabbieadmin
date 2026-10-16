import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Phone, ShieldCheck } from "lucide-react";
import { errorMessage } from "../api/client";
import { ONLY_SUPER_ADMIN, useAuth } from "../auth/AuthContext";
import { LangToggle } from "../components/Layout";
import { Field } from "../components/ui";
import { useT } from "../i18n";

export default function Login() {
  const t = useT();
  const { user, login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) return setError(t("Enter a valid 10-digit phone number"));
    if (password.length < 6) return setError(t("Password must be 6+ characters"));
    setBusy(true);
    setError("");
    try {
      await login(phone, password);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg === ONLY_SUPER_ADMIN ? t("This panel is only for Super Admins. Agencies and drivers should use the mobile app.") : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="row" style={{ justifyContent: "flex-end", marginBottom: 10 }}>
          <LangToggle dark />
        </div>
        <div className="login-hero">
          <div className="tool-icon" style={{ width: 52, height: 52, background: "rgba(255,255,255,.18)", borderRadius: 14 }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1>{t("Super Admin Login")}</h1>
            <div className="small" style={{ opacity: 0.85 }}>{t("Platform owner access")}</div>
          </div>
        </div>
        <form className="login-body" onSubmit={submit}>
          <Field label={t("Phone Number")}>
            <div className="input-icon">
              <Phone size={16} />
              <input className="input" inputMode="tel" autoFocus value={phone} maxLength={13}
                placeholder={t("Enter your 10-digit number")} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </Field>
          <Field label={t("Password")}>
            <div className="input-icon">
              <Lock size={16} />
              <input className="input" type={show ? "text" : "password"} value={password} style={{ paddingRight: 40 }}
                placeholder={t("Enter your password")} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)}
                style={{ position: "absolute", right: 2, top: 2 }} aria-label="toggle password">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          {error && <div className="banner error mb">{error}</div>}
          <button className="btn lg block" disabled={busy}>{busy ? t("Signing in…") : t("Sign In")}</button>
          <div className="hint mt" style={{ textAlign: "center" }}>DutyLink v1.0.0</div>
        </form>
      </div>
    </div>
  );
}
