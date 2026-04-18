// ---------------------------------------------------------------------------
// Raw offer as extracted from a loyalty program website
// ---------------------------------------------------------------------------
export interface RawOffer {
  title: string;
  description: string;
  /** Number of miles being offered or required */
  miles: number;
  /** Price in Brazilian Reais (BRL) */
  priceBrl: number;
  /** URL of the offer page */
  url: string;
  /** When the offer expires (if known) */
  expiresAt?: Date;
  /** Offer type matching the Prisma OfferType enum */
  type: 'PURCHASE' | 'TRANSFER_BONUS' | 'AWARD_DISCOUNT' | 'PROMO';
  /** Optional arbitrary metadata (route, bonus %, etc.) */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Normalized offer ready to be persisted
// ---------------------------------------------------------------------------
export interface NormalizedOffer {
  programSlug: string;
  type: 'PURCHASE' | 'TRANSFER_BONUS' | 'AWARD_DISCOUNT' | 'PROMO';
  title: string;
  description: string;
  /** Cost per thousand miles in BRL */
  cpm: number;
  classification: 'IMPERDIVEL' | 'BOA' | 'NORMAL';
  sourceUrl: string;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// BullMQ job payloads
// ---------------------------------------------------------------------------
export interface ScrapeJobData {
  program: string;
  jobType: 'scrape' | 'update_cpm';
}

export interface AlertMatchJobData {
  offerId: string;
}

export interface PriceHistoryJobData {
  programId: string;
  programSlug: string;
}

// ---------------------------------------------------------------------------
// Alert condition shapes (stored as JSON in the DB)
// ---------------------------------------------------------------------------
export interface CpmThresholdConditions {
  programSlug: string;
  maxCpm: number;
}

export interface ProgramPromoConditions {
  programSlug: string;
}

export interface DestinationConditions {
  destination: string;
  cabinClass?: 'ECONOMY' | 'BUSINESS' | 'FIRST';
  programSlug?: string;
}

export type AlertConditions =
  | CpmThresholdConditions
  | ProgramPromoConditions
  | DestinationConditions;

// ---------------------------------------------------------------------------
// Notification payload
// ---------------------------------------------------------------------------
export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Price history record
// ---------------------------------------------------------------------------
export interface DailyPriceRecord {
  programId: string;
  date: Date;
  avgCpm: number;
  minCpm: number;
  source: string;
}

// ---------------------------------------------------------------------------
// Real-time flight award search
// ---------------------------------------------------------------------------
export interface FlightSearchRequest {
  origin: string;       // IATA code
  destination: string;  // IATA code
  date: string;         // YYYY-MM-DD
  cabinClass: string;   // economy, business, first
  program: string;      // smiles, tudoazul, latampass
}

export interface FlightAwardResult {
  programSlug: string;
  programName: string;
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
  milesRequired: number;
  taxBrl: number;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  stops: number;
  duration: string;
  source: 'live_scraping';
  scrapedAt: string;
}
