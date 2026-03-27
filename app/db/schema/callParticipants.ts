import {
  pgTable,
  uuid,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { calls } from "./calls";
import { users } from "./auth";

export const callParticipants = pgTable("call_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  callId: uuid("call_id")
    .notNull()
    .references(() => calls.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  leftAt: timestamp("left_at"),
  audioEnabled: boolean("audio_enabled").notNull().default(true),
  videoEnabled: boolean("video_enabled").notNull().default(true),
});

export const callParticipantsRelations = relations(
  callParticipants,
  ({ one }) => ({
    call: one(calls, {
      fields: [callParticipants.callId],
      references: [calls.id],
    }),
    user: one(users, {
      fields: [callParticipants.userId],
      references: [users.id],
    }),
  })
);

export type CallParticipant = typeof callParticipants.$inferSelect;
export type InsertCallParticipant = typeof callParticipants.$inferInsert;
