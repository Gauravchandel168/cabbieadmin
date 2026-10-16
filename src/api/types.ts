// Backend models — JSON keys bilkul backend jaise (internal/models/*.go)

export type Role = "super_admin" | "agency" | "driver";

interface Base {
  id: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** models.UserPublic (signin) — snake_case keys */
export interface UserPublic {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role: Role;
  imageURL?: string | null;
  preferred_language?: string;
  is_approved: boolean;
  is_blocked: boolean;
  agency_id?: string | null;
  driver_id?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  exp: string;
  user: UserPublic;
}

/** GET /admin/users — models.User */
export interface AdminUser extends Base {
  name: string;
  email: string;
  phoneNumber: string;
  role: Role;
  imageURL?: string | null;
  preferredLanguage?: string;
  isApproved: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
}

export interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  totalAgencies: number;
  approvedAgencies: number;
  pendingAgencies: number;
  blockedAgencies: number;
  verifiedDrivers: number;
  blockedDrivers: number;
  totalDuties: number;
  openDuties: number;
}

export interface ActivityLog extends Base {
  actorId?: string | null;
  actorName?: string | null;
  action?: string | null;
  entity?: string | null;
  entityId?: string | null;
  details?: string | null;
}

export interface EnhancedDashboard {
  stats: DashboardStats;
  recentActivities: ActivityLog[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  payments: number;
}

export interface PlanCount {
  planCode: string;
  planName: string;
  active: number;
  trial: number;
}

export interface RevenueStats {
  totalRevenue: number;
  thisMonth: number;
  lastMonth: number;
  mrr: number;
  activePaid: number;
  activeTrials: number;
  freeAgencies: number;
  expiringIn7Days: number;
  monthly: MonthlyRevenue[] | null;
  byPlan: PlanCount[] | null;
}

export interface DailyCount {
  date: string;
  posted: number;
  completed: number;
}

export interface DutyAnalytics {
  totalDuties: number;
  openDuties: number;
  acceptedDuties: number;
  ongoingDuties: number;
  completedDuties: number;
  cancelledDuties: number;
  expiredDuties: number;
  revenue: number;
  driverPayouts: number;
  acceptanceRate: number;
  totalDrivers: number;
  activeDrivers: number;
  weeklyTrend: DailyCount[] | null;
  topDrivers: { driverId?: string; name: string; duties: number }[] | null;
  popularRoutes: { fromLocation: string; toLocation: string; count: number }[] | null;
}

export type AgencyStatus = "pending" | "approved" | "blocked" | "suspended";

export interface Agency extends Base {
  user_id: string;
  name: string;
  imageUrl?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  inviteCode: string;
  status: AgencyStatus;
  blockReason?: string | null;
  isVerified: boolean;
  isApproved: boolean;
  isBlocked: boolean;
  acceptsSharedDuties: boolean;
  invoicePrefix: string;
  defaultGstRate: number;
  approvedAt?: string | null;
  blockedAt?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  activeDrivers: number;
}

export interface Vehicle extends Base {
  driverId?: string | null;
  agencyId?: string | null;
  vehicleTypeId: string;
  vehicleTypeCode: string;
  vehicleTypeName: string;
  registrationNumber: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  manufactureYear?: number | null;
  fuelType?: string | null;
  hasAc: boolean;
  seatingCapacity?: number | null;
  isPrimary: boolean;
  isVerified: boolean;
}

/** GET /admin/drivers — models.Driver */
export interface Driver extends Base {
  userId: string;
  name: string;
  phoneNumber: string;
  email: string;
  imageUrl?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  city?: string | null;
  experienceYears?: number | null;
  languages?: string[] | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  availability: string;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocationAt?: string | null;
  rating: number;
  totalRatings: number;
  totalCompletedDuties: number;
  isVerified: boolean;
  isApproved: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  status: string;
  vehicles?: Vehicle[] | null;
}

/** GET /agencies/:id/drivers — link + driver */
export interface AgencyDriver {
  linkId: string;
  linkStatus: string;
  initiatedBy?: string | null;
  isPriority: boolean;
  blockReason?: string | null;
  linkedAt?: string | null;
  driverId: string;
  userId: string;
  name: string;
  phoneNumber: string;
  city?: string | null;
  availability: string;
  rating: number;
  totalCompletedDuties: number;
  isVerified: boolean;
  isAccountBlocked: boolean;
  primaryVehicle?: { id: string; registrationNumber: string; vehicleTypeName: string; model?: string | null } | null;
}

export type DutyStatus = "open" | "accepted" | "reached" | "in_progress" | "completed" | "cancelled" | "expired";

export interface Duty extends Base {
  agencyId: string;
  executingAgencyId?: string | null;
  agencyName?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  forDate?: string | null;
  dutyType?: string | null;
  details?: string | null;
  vehicleTypeName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  fareType: string;
  fareAmount?: number | null;
  ratePerKm?: number | null;
  driverPayoutAmount?: number | null;
  status: DutyStatus;
  acceptedDriverId?: string | null;
  acceptedDriverName?: string | null;
  acceptedDriverPhone?: string | null;
  acceptedVehicleNo?: string | null;
  acceptedAt?: string | null;
  tripOtp?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalKm?: number | null;
  tollAmount?: number;
  parkingAmount?: number;
  finalAmount?: number | null;
  paymentStatus: string;
  cancelReason?: string | null;
  assignedDriverIds?: string[] | null;
}

export interface DutyStatusChange {
  fromStatus?: string | null;
  toStatus: string;
  changedBy?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
  speedKmph?: number | null;
  recordedAt?: string;
}

export interface DutyTrack {
  dutyId: string;
  status: string;
  latest?: TrackPoint | null;
  points?: TrackPoint[] | null;
}

export interface LoginActivity extends Base {
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  device?: string | null;
  location?: string | null;
  success?: boolean | null;
}

export interface ActiveSession extends Base {
  userId: string;
  userName?: string | null;
  userRole?: string | null;
  deviceName?: string | null;
  platform?: string | null;
  lastActiveAt?: string | null;
  tokenId: string;
}

export interface SubscriptionPlan extends Base {
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billingPeriod: string;
  maxDrivers?: number | null;
  maxDutiesPerMonth?: number | null;
  features: Record<string, boolean> | null;
  trialDays: number;
  sortOrder: number;
  isActive: boolean;
}

export interface AgencySubscription {
  id: string;
  agencyId: string;
  agencyName?: string | null;
  planId: string;
  plan: SubscriptionPlan;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string | null;
  autoRenew: boolean;
  source: string;
  note?: string | null;
  createdAt: string;
}

/** GET /agencies/:id/subscription */
export interface Entitlements {
  plan: SubscriptionPlan;
  subscription?: AgencySubscription | null;
  isTrial: boolean;
  daysLeft: number;
  features: Record<string, boolean>;
  maxDrivers?: number | null;
  maxDutiesPerMonth?: number | null;
  activeDrivers: number;
  dutiesThisMonth: number;
}

export interface Payment {
  id: string;
  agencyId: string;
  agencyName?: string | null;
  planCode?: string | null;
  planName?: string | null;
  periodMonths: number;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  isMock: boolean;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface Complaint {
  id: string;
  complainantId: string;
  complainantName?: string | null;
  complainantRole?: string | null;
  againstType: string;
  againstDriverId?: string | null;
  againstAgencyId?: string | null;
  againstName?: string | null;
  dutyId?: string | null;
  category: string;
  description: string;
  attachmentUrls?: string[] | null;
  status: "open" | "investigating" | "resolved" | "dismissed";
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId?: string | null;
  senderName?: string | null;
  isFromAdmin: boolean;
  message: string;
  attachmentUrls?: string[] | null;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNo: number;
  userId: string;
  userName?: string | null;
  userPhone?: string | null;
  userRole?: string | null;
  subject: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
  assignedTo?: string | null;
  lastMessageAt: string;
  unreadByAdmin: boolean;
  createdAt: string;
  messages?: TicketMessage[] | null;
}

export interface AppVersion {
  id: string;
  platform: "android" | "ios";
  versionCode: number;
  versionName: string;
  minSupportedCode: number;
  releaseNotes?: string | null;
  storeUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Document extends Base {
  ownerType: "driver" | "agency";
  ownerId: string;
  ownerName?: string | null;
  vehicleId?: string | null;
  documentType: string;
  documentNumber?: string | null;
  fileUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  verificationStatus: "pending" | "verified" | "rejected" | "expired";
  rejectionReason?: string | null;
}

export interface VehicleType extends Base {
  code: string;
  name: string;
  seatingCapacity?: number | null;
  iconUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ImpersonateResponse {
  accessToken: string;
  expiresAt: string;
  sessionId: string;
  user: unknown;
  agencyId?: string | null;
  driverId?: string | null;
}
