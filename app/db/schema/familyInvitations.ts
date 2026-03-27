import { pgTable, text, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { families } from "./families";

export const familyInvitations = pgTable("family_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("member"), // admin, member, guest
  inviteToken: varchar("invite_token", { length: 255 }).notNull().unique(),
  inviteExpiresAt: timestamp("invite_expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, resent, cancelled, accepted, declined
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const familyInvitationsRelations = relations(
  familyInvitations,
  ({ one }) => ({
    family: one(families, {
      fields: [familyInvitations.familyId],
      references: [families.id],
    }),
  })
);
