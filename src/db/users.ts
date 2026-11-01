import { db } from './index.ts';
import { users, cloudSyncSnapshots } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user account. Please try again later.', {
      cause: error,
    });
  }
}

export async function getLatestCloudSyncForUser(uid: string) {
  try {
    const rows = await db
      .select({
        id: cloudSyncSnapshots.id,
        academicYear: cloudSyncSnapshots.academicYear,
        schoolName: cloudSyncSnapshots.schoolName,
        teacherName: cloudSyncSnapshots.teacherName,
        deviceId: cloudSyncSnapshots.deviceId,
        revisionHash: cloudSyncSnapshots.revisionHash,
        payloadJson: cloudSyncSnapshots.payloadJson,
        updatedAt: cloudSyncSnapshots.updatedAt,
      })
      .from(cloudSyncSnapshots)
      .innerJoin(users, eq(cloudSyncSnapshots.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(cloudSyncSnapshots.updatedAt))
      .limit(1);

    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed while fetching cloud sync snapshot:', error);
    throw new Error('Failed to retrieve cloud sync snapshot. Please try again later.', {
      cause: error,
    });
  }
}

export async function upsertCloudSyncForUser(params: {
  uid: string;
  email: string;
  academicYear: string;
  schoolName: string;
  teacherName: string;
  deviceId: string;
  revisionHash: string;
  payloadJson: string;
}) {
  try {
    const userRecord = await getOrCreateUser(params.uid, params.email);
    const existing = await db
      .select({ id: cloudSyncSnapshots.id })
      .from(cloudSyncSnapshots)
      .where(eq(cloudSyncSnapshots.userId, userRecord.id))
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(cloudSyncSnapshots)
        .set({
          academicYear: params.academicYear,
          schoolName: params.schoolName,
          teacherName: params.teacherName,
          deviceId: params.deviceId,
          revisionHash: params.revisionHash,
          payloadJson: params.payloadJson,
          updatedAt: new Date(),
        })
        .where(eq(cloudSyncSnapshots.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(cloudSyncSnapshots)
      .values({
        userId: userRecord.id,
        academicYear: params.academicYear,
        schoolName: params.schoolName,
        teacherName: params.teacherName,
        deviceId: params.deviceId,
        revisionHash: params.revisionHash,
        payloadJson: params.payloadJson,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed while saving cloud sync snapshot:', error);
    throw new Error('Failed to save cloud sync snapshot. Please try again later.', {
      cause: error,
    });
  }
}
