import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { conversationMessagesTable } from "./conversationMessages";
import { users } from "./auth";
import { relations } from "drizzle-orm";

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").defaultRandom().notNull(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => conversationMessagesTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    index("idx_message_id").on(table.messageId),
    index("idx_user_id").on(table.userId),
    index("idx_message_user").on(table.messageId, table.userId),
  ]
);

export const messageReactionsRelations = relations(
  messageReactions,
  ({ one }) => ({
    message: one(conversationMessagesTable, {
      fields: [messageReactions.messageId],
      references: [conversationMessagesTable.id],
    }),
    user: one(users, {
      fields: [messageReactions.userId],
      references: [users.id],
    }),
  })
);
