import {
  pgTable,
  text,
  uuid,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { families } from "./families";
import { users } from "./auth";
import { callParticipants } from "./callParticipants";

export const calls = pgTable("calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  initiatorId: uuid("initiator_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  roomName: varchar("room_name", { length: 255 }).notNull().unique(),
  status: varchar("status", {
    length: 50,
    enum: ["active", "ended", "pending"],
  })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
});

export const callsRelations = relations(calls, ({ one, many }) => ({
  family: one(families, {
    fields: [calls.familyId],
    references: [families.id],
  }),
  initiator: one(users, {
    fields: [calls.initiatorId],
    references: [users.id],
  }),
  participants: many(callParticipants),
}));

export type Call = typeof calls.$inferSelect;
export type InsertCall = typeof calls.$inferInsert;
