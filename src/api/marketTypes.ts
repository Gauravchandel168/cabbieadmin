// Duty Market (Module 8) ke types — alag file, taaki types.ts badalna na pade
export type MarketStatus = "open" | "booked" | "completed" | "cancelled" | "expired";

export interface MarketPoster {
  userId: string;
  role: "driver" | "agency";
  name: string;
  imageUrl?: string | null;
  isVerified: boolean;
  rating: number;
  ratingCount: number;
  totalPosted: number;
  phone?: string | null;
}

export interface MarketPerson {
  driverId?: string | null;
  userId: string;
  name: string;
  phone?: string | null;
  imageUrl?: string | null;
  rating: number;
  totalTrips: number;
  isVerified: boolean;
  vehicleName?: string | null;
  vehicleNo?: string | null;
}

export interface MarketDuty {
  id: string;
  shortCode: string;
  shareUrl?: string | null;
  posterRole: "driver" | "agency";
  poster: MarketPoster;
  fromCity: string;
  toCity?: string | null;
  pickupAddress?: string | null;
  dropAddress?: string | null;
  distanceKm?: number | null;
  forDate: string;
  returnDate?: string | null;
  dutyType: string;
  vehicleTypeName?: string | null;
  vehicleText?: string | null;
  passengerCount?: number | null;
  notes?: string | null;
  driverGets: number;
  customerFare?: number | null;
  commission?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  postToMarket: boolean;
  groups: { id: string; name: string }[];
  source: string;
  status: MarketStatus;
  assignedDriver?: MarketPerson | null;
  bookedOutside: boolean;
  assignedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  removedByAdmin: boolean;
  viewCount: number;
  callCount: number;
  interestCount: number;
  lastCallAt?: string | null;
  createdAt: string;
}

export interface MarketLead {
  id: string;
  driver: MarketPerson;
  callCount: number;
  whatsappCount: number;
  lastCallAt?: string | null;
  isInterested: boolean;
  interestedAt?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface MarketStats {
  openNow: number;
  postedToday: number;
  posted7Days: number;
  booked7Days: number;
  expired7Days: number;
  bookingRate: number;
  calls7Days: number;
  activeAlerts: number;
  activeGroups: number;
  groupMembers: number;
  activePosters7Days: number;
  topRoutes: { fromCity: string; toCity: string; count: number }[];
  daily: { date: string; posted: number; booked: number }[];
}

export interface DutyGroup {
  id: string;
  name: string;
  city?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  isPrivate: boolean;
  whoCanPost: "all" | "admins";
  inviteCode: string;
  ownerUserId: string;
  ownerName?: string | null;
  memberCount: number;
  openDuties: number;
  pendingRequests: number;
  isActive: boolean;
  blockedByAdmin: boolean;
  blockReason?: string | null;
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  phone?: string | null;
  imageUrl?: string | null;
  userRole: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending" | "invited";
  isVerified: boolean;
  rating: number;
  totalTrips: number;
  vehicleName?: string | null;
  postedInGroup: number;
  takenInGroup: number;
  joinedAt?: string | null;
  requestedAt?: string | null;
  isOwner: boolean;
  phoneHidden: boolean;
}
