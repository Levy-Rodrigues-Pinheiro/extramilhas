// ─── User & Auth ────────────────────────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'PREMIUM' | 'PRO';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: SubscriptionPlan;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface SocialLoginPayload {
  provider: 'google' | 'apple';
  token: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Programs ────────────────────────────────────────────────────────────────

export type ProgramSlug = 'smiles' | 'livelo' | 'tudoazul' | 'latampass' | 'esfera';

export interface Program {
  id: string;
  slug: ProgramSlug;
  name: string;
  color: string;
  logoUrl?: string;
  currentCpm: number;
  averageCpm30d: number;
  transferBonus?: number;
  pointsExpiry?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Offers ──────────────────────────────────────────────────────────────────

export type OfferType = 'COMPRA' | 'TRANSFERENCIA' | 'PASSAGEM' | 'PROMO';
export type Classification = 'IMPERDIVEL' | 'BOA' | 'NORMAL';

export interface Offer {
  id: string;
  programId: string;
  program: Program;
  title: string;
  description?: string;
  type: OfferType;
  cpm: number;
  classification: Classification;
  sourceUrl: string;
  expiresAt?: string;
  isActive: boolean;
  isSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OffersResponse {
  data: Offer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OfferFilters {
  programs?: string[];
  types?: OfferType[];
  maxCpm?: number;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertType = 'CPM_THRESHOLD' | 'DESTINATION' | 'PROGRAM_PROMO';
export type CabinClass = 'ECONOMY' | 'BUSINESS' | 'FIRST';
export type AlertChannel = 'PUSH' | 'EMAIL' | 'IN_APP';

export interface AlertCondition {
  programId?: string;
  maxCpm?: number;
  origin?: string;
  destination?: string;
  maxMiles?: number;
  cabinClass?: CabinClass;
}

export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  condition: AlertCondition;
  channels: AlertChannel[];
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertPayload {
  type: AlertType;
  condition: AlertCondition;
  channels: AlertChannel[];
}

// ─── Simulator ───────────────────────────────────────────────────────────────

export type MaxStops = 'DIRECT' | 'ONE_STOP' | 'ANY';

export interface SimulatorParams {
  programIds: string[];
  miles: number;
  cabinClass: CabinClass;
  maxStops: MaxStops;
  origin?: string;
}

export interface SimulatorResult {
  destination: string;
  destinationCode: string;
  country: string;
  milesRequired: number;
  programId: string;
  programName: string;
  isGoodOption: boolean;
  emissionUrl?: string;
}

// ─── Price History ────────────────────────────────────────────────────────────

export type PriceHistoryRange = '7d' | '30d' | '90d' | '1y';

export interface PriceHistoryPoint {
  date: string;
  cpm: number;
}

export interface PriceHistory {
  programId: string;
  programName: string;
  range: PriceHistoryRange;
  currentCpm: number;
  averageCpm: number;
  minCpm: number;
  maxCpm: number;
  points: PriceHistoryPoint[];
}

// ─── Miles Balance ────────────────────────────────────────────────────────────

export interface MilesBalance {
  programId: string;
  programName: string;
  balance: number;
  expiresAt?: string;
}

export interface UserProfile {
  user: User;
  milesBalances: MilesBalance[];
}

export interface UpdateBalancesPayload {
  balances: { programId: string; balance: number }[];
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface SubscriptionPlanDetails {
  id: string;
  name: SubscriptionPlan;
  price: number;
  features: { label: string; included: boolean }[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodEnd?: string;
  createdAt: string;
}

// ─── Articles ────────────────────────────────────────────────────────────────

export interface Article {
  id: string;
  slug: string;
  title: string;
  category: string;
  thumbnail?: string;
  body: string;
  isProOnly?: boolean;
  publishedAt: string;
}

export interface ArticlesResponse {
  data: Article[];
  total: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Transfers ──────────────────────────────────────────────────────────────
export interface TransferPartnership {
  id: string;
  fromProgram: Program;
  toProgram: Program;
  baseRate: number;
  currentBonus: number;
  isActive: boolean;
  expiresAt?: string;
}

export interface TransferCalculation {
  fromProgram: Program;
  toProgram: Program;
  inputPoints: number;
  resultMiles: number;
  bonusPercent: number;
  effectiveCpm: number;
}

// ─── Explore ────────────────────────────────────────────────────────────────
export interface ExploreSection {
  title: string;
  icon: string;
  offers: Offer[];
}

export interface ExploreData {
  sections: ExploreSection[];
}

// ─── Prediction ─────────────────────────────────────────────────────────────
export interface CpmPrediction {
  trend: 'UP' | 'DOWN' | 'STABLE';
  confidence: number;
  predictedCpm7d: number | null;
  predictedCpm30d: number | null;
  currentCpm: number;
  ma7: number;
  ma30: number;
  recommendation: 'COMPRAR' | 'ESPERAR' | 'NEUTRO';
  reasoning: string;
}

// ─── Value Compare ──────────────────────────────────────────────────────────
export interface ValueComparison {
  milesValueBrl: number;
  cashPriceBrl: number;
  savings: number;
  savingsPercent: number;
  recommendation: 'MILHAS' | 'DINHEIRO' | 'EQUIVALENTE';
}

// ─── Family ─────────────────────────────────────────────────────────────────
export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  balances: FamilyMemberBalance[];
  createdAt: string;
}

export interface FamilyMemberBalance {
  id: string;
  programId: string;
  program: Program;
  balance: number;
  expiresAt?: string;
}

// ─── Flight Search ──────────────────────────────────────────────────────────

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  cabinClass: string;
  programSlug?: string;
}

export interface FlightSearchResult {
  programName: string;
  programSlug: string;
  origin: string;
  destination: string;
  destinationName: string;
  country: string;
  cabinClass: string;
  passengers: number;
  milesOneWay: number;
  milesRoundTrip: number;
  milesTotal: number;
  isRoundTrip: boolean;
  estimatedCashBrl: number;
  estimatedTicketBrl: number;
  savings: number;
  savingsPercent: number;
  recommendation: 'MILHAS' | 'DINHEIRO' | 'EQUIVALENTE';
  realCashPrice?: number;
  priceSource: 'kiwi' | 'amadeus' | 'estimated';
  airline?: string;
  flightDuration?: string;
  taxBrl?: number;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  seatsAvailable?: number;
  isLive: boolean;
  isDirectFlight: boolean;
  bookingUrl: string;
  source: string;
  disclaimer?: string;
  lastUpdatedAt?: string;
  officialUrl?: string;
  dataQuality?: 'REFERENCIA' | 'ATUALIZADO' | 'AO_VIVO';
}
