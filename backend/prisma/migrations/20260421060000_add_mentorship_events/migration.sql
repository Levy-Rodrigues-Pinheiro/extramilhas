-- MentorProfile
CREATE TABLE "mentor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "interests" TEXT NOT NULL DEFAULT '[]',
    "bio" TEXT,
    "hoursPerWeek" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mentor_profiles_userId_key" ON "mentor_profiles"("userId");
CREATE INDEX "mentor_profiles_role_isActive_idx" ON "mentor_profiles"("role", "isActive");

-- MentorshipRequest
CREATE TABLE "mentorship_requests" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mentorship_requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mentorship_requests_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mentorship_requests_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "mentorship_requests_mentorId_menteeId_key" ON "mentorship_requests"("mentorId", "menteeId");
CREATE INDEX "mentorship_requests_mentorId_status_idx" ON "mentorship_requests"("mentorId", "status");
CREATE INDEX "mentorship_requests_menteeId_status_idx" ON "mentorship_requests"("menteeId", "status");

-- Events
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'WEBINAR',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "city" TEXT,
    "maxAttendees" INTEGER NOT NULL DEFAULT 0,
    "coverImage" TEXT,
    "premiumOnly" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "events_isPublished_startsAt_idx" ON "events"("isPublished", "startsAt");

CREATE TABLE "event_rsvps" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "event_rsvps_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "event_rsvps_eventId_userId_key" ON "event_rsvps"("eventId", "userId");
CREATE INDEX "event_rsvps_userId_idx" ON "event_rsvps"("userId");
