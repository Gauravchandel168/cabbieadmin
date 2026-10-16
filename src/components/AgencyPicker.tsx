import { useEffect, useRef, useState } from "react";
import { Building2, X } from "lucide-react";
import { agencyApi } from "../api/api";
import type { Agency } from "../api/types";
import { useDebounced } from "../hooks/useAsync";
import { useT } from "../i18n";

/** Agency dhoondh kar chuno (filter ke liye) */
export default function AgencyPicker({ value, onChange }: { value: Agency | null; onChange: (a: Agency | null) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const q = useDebounced(text, 300);
  const [items, setItems] = useState<Agency[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    agencyApi.list({ search: q, limit: 8 }).then((r) => alive && setItems(r.items)).catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [q, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (value) {
    return (
      <span className="chip active" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Building2 size={14} />{value.name}
        <X size={14} style={{ cursor: "pointer" }} onClick={() => onChange(null)} />
      </span>
    );
  }
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 220 }}>
      <input className="input" value={text} placeholder={t("Filter by agency")} onFocus={() => setOpen(true)}
        onChange={(e) => { setText(e.target.value); setOpen(true); }} />
      {open && items.length > 0 && (
        <div className="tools-menu" style={{ left: 0, right: "auto", maxHeight: 320, overflowY: "auto" }}>
          {items.map((a) => (
            <div key={a.id} className="tool-item" onClick={() => { onChange(a); setOpen(false); setText(""); }}>
              <Building2 size={16} className="text-primary" />
              <div className="grow">
                <div className="bold ellipsis">{a.name}</div>
                <div className="tiny muted">{[a.city, a.ownerPhone].filter(Boolean).join(" • ")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
