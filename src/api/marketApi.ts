import { http } from "./client";
import type { DutyGroup, GroupMember, MarketDuty, MarketLead, MarketStats } from "./marketTypes";

const enc = encodeURIComponent;

// ── Duty Market (Module 8) — alag file, taaki api.ts badalna na pade ──
export const marketApi = {
  stats: () => http.get<MarketStats>("/admin/market/stats"),
  /** status: open | booked | completed | cancelled | expired | active | past */
  duties: (q: { page?: number; limit?: number; status?: string; search?: string; groupId?: string; posterUserId?: string }) =>
    http.paged<MarketDuty>("/admin/market/duties", { ...q }),
  duty: (id: string) => http.get<MarketDuty>(`/admin/market/duties/${enc(id)}`),
  leads: (id: string) => http.get<MarketLead[]>(`/admin/market/duties/${enc(id)}/leads`),
  /** Galat / spam duty hatao — poster ko notification jaata hai */
  remove: (id: string, reason: string) => http.post<MarketDuty>(`/admin/market/duties/${enc(id)}/remove`, { reason }),
  groups: (q: { page?: number; limit?: number; search?: string; blocked?: boolean }) =>
    http.paged<DutyGroup>("/admin/market/groups", { ...q }),
  /** status: active | pending | invited */
  members: (id: string, q: { page?: number; limit?: number; search?: string; status?: string }) =>
    http.paged<GroupMember>(`/admin/market/groups/${enc(id)}/members`, { ...q }),
  block: (id: string, reason: string) => http.post(`/admin/market/groups/${enc(id)}/block`, { reason }),
  unblock: (id: string) => http.post(`/admin/market/groups/${enc(id)}/unblock`),
};
