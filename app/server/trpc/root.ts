import { router } from './trpc';
import { todoRouter } from './routers/todo.router';
import { productRouter } from './routers/product.router';
import { chatRouter } from './routers/chat.router';
import { authRouter } from './routers/auth.router';
import { paymentsRouter } from './routers/payments.router';
import { familiesRouter } from './routers/families.router';
import { familyMembersRouter } from './routers/familyMembers.router';
import { postsRouter } from './routers/posts.router';
import { pusherRouter } from './routers/pusher.router';
import { mediaRouter } from './routers/media.router';
import { callsRouter } from './routers/calls.router';
import { streamingRouter } from './routers/streaming.router';
import { weatherRouter } from './routers/weather.router';
import { settingsRouter } from './routers/settings.router';
import { moderationRouter } from './routers/moderation.router';
import { integrationsRouter } from './routers/integrations.router';
import { maintenanceRouter } from './routers/maintenance.router';
import { conversationsRouter } from './routers/conversations.router';
import { reactionsRouter } from './routers/reactions.router';
import { messagesRouter } from './routers/messages.router';
import { archiveRouter } from './routers/archive.router';
import { presenceRouter } from './routers/presence.router';
import { typingIndicatorsRouter } from './routers/typingIndicators.router';
import { contentModerationRouter } from './routers/contentModeration.router';
import { photoTagsRouter } from './routers/photoTags.router';
import { digestsRouter } from './routers/digests.router';
import { subscriptionsRouter } from './routers/subscriptions.router';
import { eventSuggestionsRouter } from './routers/eventSuggestions.router';
import { calendarSyncRouter } from './routers/calendarSync.router';
import { calendarEventsRouter } from './routers/calendarEvents.router';
import { usersRouter } from './routers/users.router';
import { notificationSettingsRouter } from './routers/notificationSettings.router';
import { privacySettingsRouter } from './routers/privacySettings.router';
import { adminRouter } from './routers/admin.router';
import { tasksRouter } from './routers/tasks.router';
import { timelineRouter } from './routers/timeline.router';
import { permissionsRouter } from './routers/permissions.router';
import { auditLogsRouter } from './routers/auditLogs.router';
import { invitesRouter } from './routers/invites.router';
import { gamesRouter } from './routers/games.router';
import { entertainmentRouter } from './routers/entertainment.router';
import { notificationsRouter } from './routers/notifications.router';
import { remindersRouter } from './routers/reminders.router';
import { announcementsRouter } from './routers/announcements.router';
import { shoppingListsRouter } from './routers/shoppingLists.router';
import { billingRouter } from './routers/billing.router';
import { subscriptionSyncRouter } from './routers/subscription-sync.router';
import { featureAccessRouter } from './routers/featureAccess.router';
import { tierAccessRouter } from './routers/tierAccess.router';
import { photoDigitizationRouter } from './routers/photoDigitization.router';
import { inquiryRouter } from './routers/inquiry.router';
import { adminSecureFoldersRouter } from './routers/adminSecureFolders.router';
import { supportRouter } from './routers/support.router';
import { faceBlurRouter } from './routers/faceBlur.router';
import { clearanceLevelRouter } from './routers/clearanceLevel.router';

// Define the root router that combines all your sub-routers
export const appRouter = router({
  payments: paymentsRouter,
  todo: todoRouter,
  product: productRouter,
  chat: chatRouter,
  auth: authRouter,
  families: familiesRouter,
  familyMembers: familyMembersRouter,
  posts: postsRouter,
  pusher: pusherRouter,
  media: mediaRouter,
  calls: callsRouter,
  streaming: streamingRouter,
  weather: weatherRouter,
  settings: settingsRouter,
  moderation: moderationRouter,
  integrations: integrationsRouter,
  maintenance: maintenanceRouter,
  conversations: conversationsRouter,
  reactions: reactionsRouter,
  messages: messagesRouter,
  archive: archiveRouter,
  presence: presenceRouter,
  typingIndicators: typingIndicatorsRouter,
  contentModeration: contentModerationRouter,
  photoTags: photoTagsRouter,
  digests: digestsRouter,
  subscriptions: subscriptionsRouter,
  eventSuggestions: eventSuggestionsRouter,
  calendarSync: calendarSyncRouter,
  calendarEvents: calendarEventsRouter,
  users: usersRouter,
  notificationSettings: notificationSettingsRouter,
  privacySettings: privacySettingsRouter,
  admin: adminRouter,
  tasks: tasksRouter,
  timeline: timelineRouter,
  permissions: permissionsRouter,
  auditLogs: auditLogsRouter,
  invites: invitesRouter,
  games: gamesRouter,
  entertainment: entertainmentRouter,
  notifications: notificationsRouter,
  reminders: remindersRouter,
  announcements: announcementsRouter,
  shoppingLists: shoppingListsRouter,
  billing: billingRouter,
  subscriptionSync: subscriptionSyncRouter,
  featureAccess: featureAccessRouter,
  tierAccess: tierAccessRouter,
  photoDigitization: photoDigitizationRouter,
  inquiry: inquiryRouter,
  adminSecureFolders: adminSecureFoldersRouter,
  support: supportRouter,
  faceBlur: faceBlurRouter,
  clearanceLevel: clearanceLevelRouter,
});

// Export type definition of the API
export type AppRouter = typeof appRouter;
