import { pgTable, text, uuid, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { families } from "./families";

export const userClearanceLevels = pgTable(
  "user_clearance_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .references(() => families.id, { onDelete: "cascade" })
      .notNull(),
    levelName: varchar("level_name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_clearance_levels_family_id_level_name_idx").on(
      table.familyId,
      table.levelName
    ),
    index("user_clearance_levels_family_id_idx").on(table.familyId),
    index("user_clearance_levels_level_name_idx").on(table.levelName),
  ]
);

export const userClearanceLevelsRelations = relations(
  userClearanceLevels,
  ({ one }) => ({
    family: one(families, {
      fields: [userClearanceLevels.familyId],
      references: [families.id],
    }),
  })
);
