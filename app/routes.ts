// Copyright © 2026 Hohenstein. All rights reserved.

import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // API routes - MUST be outside layout to avoid React Router form submission interception
  route("api/trpc/*", "routes/api.trpc.$.tsx"),
  route("api/docs/*", "routes/api.docs.$.tsx"),
  
  layout("routes/root.tsx", [
    index("routes/home.tsx"),
    route("landing", "routes/landing.tsx"),
    route("features", "routes/features.tsx"),
    route("pricing", "routes/pricing.tsx"),
    route("guide", "routes/guide.tsx"),
    route("donate", "routes/donate.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("dashboard/onboarding", "routes/dashboard/onboarding.tsx"),
    route("dashboard/billing", "routes/dashboard/billing.tsx"),
    route("dashboard/messages", "routes/dashboard/messages.tsx"),
    route("dashboard/conversations", "routes/dashboard/conversations.tsx"),
    route("dashboard/media", "routes/dashboard/media.tsx"),
    route("dashboard/calls", "routes/dashboard/calls.tsx"),
    route("dashboard/calls/:callId", "routes/dashboard/calls/$callId.tsx"),
    route("dashboard/theater", "routes/dashboard/theater.tsx"),
    route("dashboard/digests", "routes/dashboard/digests.tsx"),
    route("dashboard/events", "routes/dashboard/events.tsx"),
    route("dashboard/timeline", "routes/dashboard/timeline.tsx"),
    route("dashboard/announcements", "routes/dashboard/announcements.tsx"),
    route("dashboard/shopping-lists", "routes/dashboard/shopping-lists.tsx"),
    route("dashboard/settings", "routes/dashboard/settings.tsx"),
    route("dashboard/family/:familyId", "routes/dashboard/family/$familyId.tsx"),
    route("dashboard/members", "routes/dashboard/members.tsx"),
    route("family-invite/:token", "routes/family-invite/$token.tsx"),
    route("share/timeline/:shareToken", "routes/share/timeline.$shareToken.tsx"),
    route("designSystem", "routes/designSystem.tsx"),
    route("docs", "routes/docs.tsx"),
    // Admin routes
    route("admin/families", "routes/admin/families.tsx"),
    route("admin/clearance-levels", "routes/admin/clearance-levels.tsx"),
    route("admin/donations", "routes/admin/donations.tsx"),
    route("admin/moderation", "routes/admin/moderation.tsx"),
    route("admin/integrations", "routes/admin/integrations.tsx"),
    route("admin/maintenance", "routes/admin/maintenance.tsx"),
    route("admin/pin-messages", "routes/admin/pin-messages.tsx"),
    route("admin/archive-threads", "routes/admin/archive-threads.tsx"),
    route("admin/billing/plans", "routes/admin/billing/plans.tsx"),
    route("admin/photo-digitization", "routes/admin/photo-digitization.tsx"),
    route("admin/inquiries", "routes/admin/inquiries.tsx"),
    route("dev/test-data", "routes/dev.test-data.tsx"),
    // OAuth routes
    route("auth/github", "routes/auth/github.tsx"),
    route("auth/github/callback", "routes/auth/github.callback.tsx"),
    route("auth/google", "routes/auth/google.tsx"),
    route("auth/google/callback", "routes/auth/google.callback.tsx"),
    // Catch-all 404
    route("*", "routes/$.tsx"),
  ]),
] satisfies RouteConfig;
