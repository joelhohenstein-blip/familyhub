import { pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { families } from './families';
import { familyMembers } from './familyMembers';
import { users } from './auth';

// Enums for list types and priorities
export const listTypeEnum = pgEnum('list_type', ['tasks', 'shopping']);
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const itemStatusEnum = pgEnum('item_status', ['pending', 'in_progress', 'completed']);
export const shareAccessEnum = pgEnum('share_access', ['view', 'edit']);
export const shoppingCategoryEnum = pgEnum('shopping_category', [
  'produce',
  'meat',
  'dairy',
  'pantry',
  'household',
  'other',
]);
export const unitEnum = pgEnum('unit', [
  'piece',
  'kg',
  'lbs',
  'ml',
  'L',
  'dozen',
  'oz',
  'cup',
  'tbsp',
  'tsp',
]);

// Define Todo table (legacy)
export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  completed: boolean('completed').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Task Lists table - shared lists within a family
export const taskLists = pgTable('task_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  familyId: uuid('family_id')
    .references(() => families.id, { onDelete: 'cascade' })
    .notNull(),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: listTypeEnum('type').notNull().default('tasks'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Todo Items table - individual items within a task list
export const todoItems = pgTable('todo_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: priorityEnum('priority').notNull().default('medium'),
  status: itemStatusEnum('status').notNull().default('pending'),
  assignedTo: uuid('assigned_to')
    .references(() => familyMembers.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date'),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Shopping List Items table - individual items within a shopping list
export const shoppingListItems = pgTable('shopping_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'cascade' })
    .notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1),
  unit: unitEnum('unit'),
  category: shoppingCategoryEnum('category').notNull().default('other'),
  isChecked: boolean('is_checked').notNull().default(false),
  assignedTo: uuid('assigned_to')
    .references(() => familyMembers.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// List Shares table - access control for shared lists
export const listShares = pgTable('list_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'cascade' })
    .notNull(),
  sharedWith: uuid('shared_with')
    .references(() => familyMembers.id, { onDelete: 'cascade' })
    .notNull(),
  accessLevel: shareAccessEnum('access_level').notNull().default('view'),
  sharedBy: uuid('shared_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  shareToken: varchar('share_token', { length: 255 }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const taskListsRelations = relations(taskLists, ({ one, many }) => ({
  family: one(families, {
    fields: [taskLists.familyId],
    references: [families.id],
  }),
  creator: one(users, {
    fields: [taskLists.createdBy],
    references: [users.id],
  }),
  items: many(todoItems),
  shares: many(listShares),
  eventLinks: many(listEventLinks),
  announcements: many(listAnnouncements),
}));

export const todoItemsRelations = relations(todoItems, ({ one }) => ({
  list: one(taskLists, {
    fields: [todoItems.listId],
    references: [taskLists.id],
  }),
  assignee: one(familyMembers, {
    fields: [todoItems.assignedTo],
    references: [familyMembers.id],
  }),
  creator: one(users, {
    fields: [todoItems.createdBy],
    references: [users.id],
  }),
}));

export const shoppingListItemsRelations = relations(shoppingListItems, ({ one }) => ({
  list: one(taskLists, {
    fields: [shoppingListItems.listId],
    references: [taskLists.id],
  }),
  assignee: one(familyMembers, {
    fields: [shoppingListItems.assignedTo],
    references: [familyMembers.id],
  }),
  creator: one(users, {
    fields: [shoppingListItems.createdBy],
    references: [users.id],
  }),
}));

export const listSharesRelations = relations(listShares, ({ one }) => ({
  list: one(taskLists, {
    fields: [listShares.listId],
    references: [taskLists.id],
  }),
  sharedWithMember: one(familyMembers, {
    fields: [listShares.sharedWith],
    references: [familyMembers.id],
  }),
  sharedByUser: one(users, {
    fields: [listShares.sharedBy],
    references: [users.id],
  }),
}));

// List Event Links table - links shopping lists to calendar events
export const listEventLinks = pgTable('list_event_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'cascade' })
    .notNull(),
  eventId: uuid('event_id').notNull(),
  linkedBy: uuid('linked_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// List Announcements table - announcements related to shopping lists
export const listAnnouncements = pgTable('list_announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id')
    .references(() => taskLists.id, { onDelete: 'cascade' })
    .notNull(),
  eventLinkId: uuid('event_link_id')
    .references(() => listEventLinks.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdBy: uuid('created_by')
    .references(() => users.id, { onDelete: 'set null' })
    .notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations for new tables
export const listEventLinksRelations = relations(listEventLinks, ({ one, many }) => ({
  list: one(taskLists, {
    fields: [listEventLinks.listId],
    references: [taskLists.id],
  }),
  linkedByUser: one(users, {
    fields: [listEventLinks.linkedBy],
    references: [users.id],
  }),
  announcements: many(listAnnouncements),
}));

export const listAnnouncementsRelations = relations(listAnnouncements, ({ one }) => ({
  list: one(taskLists, {
    fields: [listAnnouncements.listId],
    references: [taskLists.id],
  }),
  eventLink: one(listEventLinks, {
    fields: [listAnnouncements.eventLinkId],
    references: [listEventLinks.id],
  }),
  createdByUser: one(users, {
    fields: [listAnnouncements.createdBy],
    references: [users.id],
  }),
}));

// Types for TypeScript
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export type TaskList = typeof taskLists.$inferSelect;
export type NewTaskList = typeof taskLists.$inferInsert;

export type TodoItem = typeof todoItems.$inferSelect;
export type NewTodoItem = typeof todoItems.$inferInsert;

export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type NewShoppingListItem = typeof shoppingListItems.$inferInsert;

export type ListShare = typeof listShares.$inferSelect;
export type NewListShare = typeof listShares.$inferInsert;

export type ListEventLink = typeof listEventLinks.$inferSelect;
export type NewListEventLink = typeof listEventLinks.$inferInsert;

export type ListAnnouncement = typeof listAnnouncements.$inferSelect;
export type NewListAnnouncement = typeof listAnnouncements.$inferInsert; 