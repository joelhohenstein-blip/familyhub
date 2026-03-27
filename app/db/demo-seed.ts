import type { NewUser } from './schema';
import { db } from './index.server';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const TEST_USER_PASSWORD = 'test123';

export async function seedDemoData() {
  try {
    console.log('🌱 Creating demo data...');
    
    // Create test user
    const testUserId = uuid();
    const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    await db.insert(schema.users).values({
      id: testUserId,
      email: "demo@familyhub.local",
      firstName: "Demo",
      lastName: "User",
      passwordHash,
    });
    console.log('✓ Demo user created (demo@familyhub.local / test123)');
    
    // Create family
    const familyId = uuid();
    await db.insert(schema.families).values({
      id: familyId,
      surname: "Johnson",
      ownerId: testUserId,
      description: "Demo family for testing",
      avatarUrl: null,
    });
    console.log('✓ Family "Johnson" created');
    
    // Add user as admin
    await db.insert(schema.familyMembers).values({
      id: uuid(),
      familyId: familyId,
      userId: testUserId,
      role: 'admin',
      status: 'active',
      acceptedAt: new Date(),
    });
    console.log('✓ Admin member added');
    
    // Create sample messages
    const msg1Id = uuid();
    const msg2Id = uuid();
    
    await db.insert(schema.postsTable).values([
      {
        id: msg1Id,
        familyId: familyId,
        authorId: testUserId,
        content: "👋 Welcome to FamilyHub! This is where we stay connected. Share photos, coordinate events, and keep everyone in the loop.",
        parentPostId: null,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        id: msg2Id,
        familyId: familyId,
        authorId: testUserId,
        content: "Who's free for a video call this weekend? Would love to catch up!",
        parentPostId: null,
        status: 'active',
        createdAt: new Date(Date.now() - 1800000),
        updatedAt: new Date(Date.now() - 1800000),
      },
      {
        id: uuid(),
        familyId: familyId,
        authorId: testUserId,
        content: "Count me in! Saturday evening works great for me 🙌",
        parentPostId: msg2Id,
        status: 'active',
        createdAt: new Date(Date.now() - 600000),
        updatedAt: new Date(Date.now() - 600000),
      },
    ]);
    console.log('✓ Sample messages created');
    
    // Create calendar events
    const nextWeek = new Date(Date.now() + 86400000 * 7);
    const nextMonth = new Date(Date.now() + 86400000 * 35);
    
    await db.insert(schema.calendarEvents).values([
      {
        id: uuid(),
        familyId: familyId,
        title: "Weekly Family Video Call",
        description: "Saturday evening family catch-up",
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 3600000),
        location: "Virtual - Jitsi",
        createdBy: testUserId,
        visibility: 'family',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        title: "Grandma's Birthday Celebration",
        description: "Let's celebrate together!",
        startTime: nextMonth,
        endTime: new Date(nextMonth.getTime() + 28800000),
        location: "Family Home",
        createdBy: testUserId,
        visibility: 'family',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✓ Calendar events created');
    
    // Create announcements
    await db.insert(schema.announcements).values([
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "📺 New Streaming Theater Feature!",
        content: "Access all your favorite free streaming services in one place. Check out the Theater tab to get started!",
        category: 'family_news',
        isPinned: true,
        priority: 2,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "🛒 Try Our Shopping List Feature",
        content: "Plan meals together and share shopping lists with the family. Make grocery shopping easier!",
        category: 'reminders',
        isPinned: false,
        priority: 1,
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log('✓ Announcements created');
    
    console.log('\n✅ Demo data ready! Login with:');
    console.log('   Email: demo@familyhub.local');
    console.log('   Password: test123');
    
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    throw error;
  }
}

if ((import.meta as any).main) {
  seedDemoData().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
}
