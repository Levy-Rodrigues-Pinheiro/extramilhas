export type SubscriptionPlan = 'FREE' | 'PREMIUM' | 'PRO'
export type OfferType = 'PURCHASE' | 'TRANSFER_BONUS' | 'AWARD_DISCOUNT' | 'PROMO'
export type OfferClassification = 'IMPERDIVEL' | 'BOA' | 'NORMAL'
export type AlertType = 'CPM_THRESHOLD' | 'PROGRAM_OFFER' | 'CLASSIFICATION'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiresAt?: string
  milesBalance?: Record<string, number>
  alertsCount?: number
  createdAt: string
  updatedAt?: string
}

export interface LoyaltyProgram {
  id: string
  name: string
  slug: string
  logoUrl?: string
  websiteUrl?: string
  avgCpmCurrent?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Offer {
  id: string
  programId: string
  program?: LoyaltyProgram
  type: OfferType
  title: string
  description?: string
  cpm: number
  classification: OfferClassification
  sourceUrl?: string
  affiliateUrl?: string
  startsAt?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface Alert {
  id: string
  userId: string
  type: AlertType
  conditions: Record<string, unknown>
  isActive: boolean
  lastTriggeredAt?: string
  createdAt?: string
}

export interface ContentArticle {
  id: string
  title: string
  slug: string
  body: string
  category: string
  isProOnly: boolean
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface Notification {
  id: string
  title: string
  body: string
  target: 'ALL' | SubscriptionPlan
  sentAt: string
  recipientCount?: number
}

export interface DashboardMetrics {
  totalUsers: number
  premiumProSubscribers: number
  activeSubscribers: number
  totalActiveOffers: number
  activeOffers: number
  alertsTriggeredToday: number
  userGrowth: Array<{ date: string; count: number }>
  revenueByPlan: Array<{ plan: string; revenue: number }>
  recentOffers: Offer[]
  recentUsers: User[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  message: string
  statusCode: number
  errors?: Record<string, string[]>
}
