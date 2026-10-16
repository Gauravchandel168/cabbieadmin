import { http } from "./client";
import type {
  ActiveSession, ActivityLog, AdminUser, Agency, AgencyDriver, AgencySubscription, AppVersion, Complaint,
  DashboardStats, Document, Driver, Duty, DutyAnalytics, DutyStatusChange, DutyTrack, EnhancedDashboard,
  Entitlements, ImpersonateResponse, LoginActivity, Payment, RevenueStats, SignInResponse, SubscriptionPlan,
  SupportTicket, VehicleType,
} from "./types";

// Har path / query / body backend ke router + DTOs se mel khata hai.
const enc = encodeURIComponent;

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  signIn: (phoneNumber: string, password: string) =>
    http.post<SignInResponse>("/auth/signin", { phoneNumber, password }),
  signOut: (refreshToken: string) => http.post("/auth/signout", { refreshToken }),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post("/auth/change-password", { oldPassword, newPassword }),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  stats: () => http.get<DashboardStats>("/admin/dashboard"),
  enhanced: () => http.get<EnhancedDashboard>("/admin/dashboard/enhanced"),
  activities: () => http.get<ActivityLog[]>("/admin/activities"),
  /** agencyId na do = poora platform */
  analytics: (agencyId?: string) => http.get<DutyAnalytics>("/analytics", { agencyId }),
  runJobs: () => http.post("/admin/jobs/run"),
};

// ── Agencies ──────────────────────────────────────────
export interface AgencyListQuery {
  page?: number;
  limit?: number;
  status?: string;
  city?: string;
  search?: string;
  /** name | city | status | createdAt */
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export const agencyApi = {
  list: (q: AgencyListQuery) => http.paged<Agency>("/agencies", { ...q }),
  get: (id: string) => http.get<Agency>(`/agencies/${enc(id)}`),
  approve: (id: string) => http.post(`/agencies/${enc(id)}/approve`),
  block: (id: string, reason: string) => http.post(`/agencies/${enc(id)}/block`, { reason }),
  unblock: (id: string) => http.post(`/agencies/${enc(id)}/unblock`),
  verify: (id: string) => http.post(`/agencies/${enc(id)}/verify`),
  /** approved | blocked | suspended | active */
  setStatus: (id: string, status: string, reason?: string) =>
    http.patch(`/agencies/${enc(id)}/status`, { status, reason: reason || "" }),
  remove: (id: string) => http.del(`/agencies/${enc(id)}`),
  /** Owner account + agency ek saath */
  createWithOwner: (body: { name: string; email: string; phone: string; agencyName: string; password: string }) =>
    http.post<Agency>("/admin/agencies", body),
  /** status: active | requests | invited_by_agency | blocked */
  drivers: (id: string, q: { page?: number; limit?: number; status?: string; search?: string }) =>
    http.paged<AgencyDriver>(`/agencies/${enc(id)}/drivers`, { ...q }),
  subscription: (id: string) => http.get<Entitlements>(`/agencies/${enc(id)}/subscription`),
  /** Cash / bank deal ya free extension */
  setPlan: (id: string, planCode: string, months: number, note: string) =>
    http.patch<AgencySubscription>(`/agencies/${enc(id)}/subscription`, { planCode, months, note }),
  payments: (id: string, q: { page?: number; limit?: number }) =>
    http.paged<Payment>(`/agencies/${enc(id)}/payments`, { ...q }),
};

// ── Drivers ───────────────────────────────────────────
export interface DriverListQuery {
  page?: number;
  limit?: number;
  /** active | blocked | verified | unverified */
  status?: string;
  availability?: string;
  city?: string;
  agencyId?: string;
  search?: string;
  /** name | rating | duties | createdAt */
  sortBy?: string;
}
export const driverApi = {
  list: (q: DriverListQuery) => http.paged<Driver>("/admin/drivers", { ...q }),
  verify: (id: string) => http.post(`/drivers/${enc(id)}/verify`),
  merge: (primaryDriverId: string, duplicateDriverId: string) =>
    http.post("/admin/drivers/merge", { primaryDriverId, duplicateDriverId }),
  verifyVehicle: (vehicleId: string) => http.post(`/admin/vehicles/${enc(vehicleId)}/verify`),
};

// ── Users (block / password / logout / impersonate) ─────────
export const userApi = {
  list: (q: { page?: number; limit?: number; role?: string; search?: string }) =>
    http.paged<AdminUser>("/admin/users", { ...q }),
  block: (userId: string, reason: string) => http.post(`/admin/users/${enc(userId)}/block`, { reason }),
  unblock: (userId: string) => http.post(`/admin/users/${enc(userId)}/unblock`),
  resetPassword: (userId: string, newPassword: string) =>
    http.post(`/admin/users/${enc(userId)}/reset-password`, { newPassword }),
  forceLogout: (userId: string) => http.post(`/admin/security/force-logout/${enc(userId)}`),
  impersonate: (targetUserId: string) => http.post<ImpersonateResponse>("/admin/impersonate", { targetUserId }),
  endImpersonation: (sessionId: string) => http.post(`/admin/impersonate/${enc(sessionId)}/end`),
};

// ── Duties ────────────────────────────────────────────
export const dutyApi = {
  /** status comma se kai: "accepted,reached". fromDate / toDate: YYYY-MM-DD (IST) */
  list: (q: {
    page?: number; limit?: number; status?: string; agencyId?: string; search?: string;
    dutyType?: string; fromDate?: string; toDate?: string; today?: boolean;
  }) => http.paged<Duty>("/admin/duties", { ...q, today: q.today ? "true" : undefined }),
  get: (id: string) => http.get<Duty>(`/duties/${enc(id)}`),
  cancel: (id: string, reason: string) => http.post(`/duties/${enc(id)}/cancel`, { reason }),
  reopen: (id: string) => http.post(`/duties/${enc(id)}/reopen`),
  remove: (id: string) => http.del(`/duties/${enc(id)}`),
  reassign: (id: string, assignedDriverIds: string[]) =>
    http.post(`/duties/${enc(id)}/reassign`, { assignedDriverIds }),
  billing: (id: string, body: { finalAmount?: number; driverPayoutAmount?: number; paymentStatus?: string }) =>
    http.patch<Duty>(`/duties/${enc(id)}/billing`, body),
  history: (id: string) => http.get<DutyStatusChange[]>(`/duties/${enc(id)}/history`),
  track: (id: string) => http.get<DutyTrack>(`/duties/${enc(id)}/track`),
};

// ── Documents ─────────────────────────────────────────
export const documentApi = {
  /** status: pending | verified | rejected | expired | all */
  list: (ownerType: "driver" | "agency", q: { status?: string; page?: number; limit?: number }) =>
    http.paged<Document>(`/admin/documents/${ownerType}`, { ...q }),
  verify: (ownerType: string, docId: string) => http.post(`/admin/documents/${ownerType}/${enc(docId)}/verify`),
  reject: (ownerType: string, docId: string, reason: string) =>
    http.post(`/admin/documents/${ownerType}/${enc(docId)}/reject`, { reason }),
};

// ── Finance ───────────────────────────────────────────
export interface PlanBody {
  code: string;
  name?: string;
  description?: string;
  price?: number;
  billingPeriod?: string;
  /** -1 = unlimited */
  maxDrivers?: number;
  maxDutiesPerMonth?: number;
  features?: Record<string, boolean>;
  trialDays?: number;
  sortOrder?: number;
  isActive?: boolean;
}
export const financeApi = {
  revenue: () => http.get<RevenueStats>("/admin/revenue"),
  /** status: live | expiring | trial | active | cancelled | expired | all */
  subscriptions: (q: { status?: string; planCode?: string; page?: number; limit?: number }) =>
    http.paged<AgencySubscription>("/admin/subscriptions", { ...q }),
  payments: (q: { agencyId?: string; page?: number; limit?: number }) =>
    http.paged<Payment>("/admin/payments", { ...q }),
  plans: () => http.get<SubscriptionPlan[]>("/admin/plans"),
  createPlan: (body: PlanBody) => http.post<SubscriptionPlan>("/admin/plans", body),
  updatePlan: (id: string, body: PlanBody) => http.put<SubscriptionPlan>(`/admin/plans/${enc(id)}`, body),
};

// ── Communication ─────────────────────────────────────
export const notifyApi = {
  /** targetRole: driver | agency | "" (sab) */
  broadcast: (title: string, message: string, targetRole: string) =>
    http.post<{ recipients: number }>("/admin/broadcast", { title, message, targetRole }),
  send: (userIds: string[], title: string, message: string) =>
    http.post<{ recipients: number }>("/admin/notifications/send", { userIds, title, message, data: {} }),
};

// ── Support / complaints ──────────────────────────────
export const supportApi = {
  /** status: active (default) | open | in_progress | waiting_on_user | resolved | closed | all */
  tickets: (q: { status?: string; category?: string; search?: string; page?: number; limit?: number }) =>
    http.paged<SupportTicket>("/admin/support/tickets", { ...q }),
  ticket: (id: string) => http.get<SupportTicket>(`/support/tickets/${enc(id)}`),
  reply: (id: string, message: string) => http.post(`/support/tickets/${enc(id)}/messages`, { message }),
  setStatus: (id: string, status: string) => http.patch(`/admin/support/tickets/${enc(id)}/status`, { status }),
  /** adminId khaali = khud */
  assign: (id: string, adminId = "") => http.post(`/admin/support/tickets/${enc(id)}/assign`, { adminId }),
  complaints: (q: { status?: string; againstType?: string; page?: number; limit?: number }) =>
    http.paged<Complaint>("/admin/complaints", { ...q }),
  updateComplaint: (id: string, status: string, resolution?: string) =>
    http.patch<Complaint>(`/admin/complaints/${enc(id)}`, { status, resolution: resolution || undefined }),
};

// ── Security / permissions ────────────────────────────
export const securityApi = {
  logs: () => http.get<LoginActivity[]>("/admin/security/logs"),
  devices: () => http.get<ActiveSession[]>("/admin/security/devices"),
  forceLogout: (userId: string) => http.post(`/admin/security/force-logout/${enc(userId)}`),
  /** roleId: agency | driver */
  permissions: (roleId: string) =>
    http.get<{ roleId: string; permissions: Record<string, boolean> | null }>(`/admin/permissions/${enc(roleId)}`),
  savePermissions: (roleId: string, permissions: Record<string, boolean>) =>
    http.put(`/admin/permissions/${enc(roleId)}`, { permissions }),
};

// ── System ────────────────────────────────────────────
export interface VehicleTypeBody {
  code: string;
  name: string;
  seatingCapacity?: number;
  sortOrder?: number;
  isActive?: boolean;
}
export const systemApi = {
  settings: () => http.get<Record<string, string>>("/admin/settings"),
  /** body = { key: value, ... } */
  saveSettings: (values: Record<string, string>) => http.put("/admin/settings", values),
  appVersions: (platform?: string) => http.get<AppVersion[]>("/admin/app-versions", { platform }),
  createAppVersion: (body: {
    platform: string;
    versionCode: number;
    versionName: string;
    minSupportedCode: number;
    releaseNotes?: string;
    storeUrl?: string;
  }) => http.post<AppVersion>("/admin/app-versions", body),
  setAppVersionActive: (id: string, isActive: boolean) =>
    http.patch(`/admin/app-versions/${enc(id)}`, { isActive }),
  vehicleTypes: () => http.get<VehicleType[]>("/vehicle-types"),
  createVehicleType: (body: VehicleTypeBody) => http.post<VehicleType>("/admin/vehicle-types", body),
  updateVehicleType: (id: string, body: VehicleTypeBody) =>
    http.put<VehicleType>(`/admin/vehicle-types/${enc(id)}`, body),
};
