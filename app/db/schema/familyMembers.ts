import { pgTable, text, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./auth";
import { families } from "./families";
import { userClearanceLevels } from "./userClearanceLevels";

export const familyMembers = pgTable("family_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull().default(""),
  lastName: varchar("last_name", { length: 100 }).notNull().default(""),
  role: varchar("role", { length: 20 }).notNull().default("member"), // admin, member, guest
  avatarUrl: text("avatar_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // invited, active, inactive
  inviteToken: varchar("invite_token", { length: 255 }),
  inviteExpiresAt: timestamp("invite_expires_at"),
  acceptedAt: timestamp("accepted_at"),
  clearanceLevelId: uuid("clearance_level_id")
    .references(() => userClearanceLevels.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
}));
