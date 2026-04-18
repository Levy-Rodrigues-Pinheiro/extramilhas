/**
 * Local enum definitions mirroring the Prisma schema.
 * SQLite doesn't support native enums, so we define them here.
 * These are used throughout the backend for type safety and validation.
 */

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  APPLE = 'APPLE',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  PRO = 'PRO',
}

export enum OfferType {
  PURCHASE = 'PURCHASE',
  TRANSFER_BONUS = 'TRANSFER_BONUS',
  AWARD_DISCOUNT = 'AWARD_DISCOUNT',
  PROMO = 'PROMO',
}

export enum OfferClassification {
  IMPERDIVEL = 'IMPERDIVEL',
  BOA = 'BOA',
  NORMAL = 'NORMAL',
}

export enum AlertType {
  CPM_THRESHOLD = 'CPM_THRESHOLD',
  DESTINATION = 'DESTINATION',
  PROGRAM_PROMO = 'PROGRAM_PROMO',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
}
