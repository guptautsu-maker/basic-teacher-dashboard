import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cloudSyncSnapshots = pgTable('cloud_sync_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  academicYear: text('academic_year').notNull(),
  schoolName: text('school_name').notNull(),
  teacherName: text('teacher_name').notNull(),
  deviceId: text('device_id').notNull(),
  revisionHash: text('revision_hash').notNull(),
  payloadJson: text('payload_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  snapshots: many(cloudSyncSnapshots),
}));

export const cloudSyncSnapshotsRelations = relations(cloudSyncSnapshots, ({ one }) => ({
  author: one(users, {
    fields: [cloudSyncSnapshots.userId],
    references: [users.id],
  }),
}));
