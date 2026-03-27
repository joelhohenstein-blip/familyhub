import type { NewProduct, NewTodo, NewUser } from './schema';
import { db } from './index.server';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

// Test user credentials - use these for testing/login
// Email: test@test.com
// Password: test123
const TEST_USER_PASSWORD = 'test123';

// Seed data with proper UUIDs (including the one expected by route)
export const seedProducts: NewProduct[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000", // UUID expected by route
    name: "Modern Living Room Sofa",
    price: "1299.99",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    dimensions: {
      width: 84,
      height: 32,
      depth: 36
    },
    model3DUrl: "https://example.com/models/sofa_001.glb"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001", // Second UUID from our tests
    name: "Modern Leather Sofa",
    price: "1299.99",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    dimensions: {
      width: 84,
      height: 32,
      depth: 36
    },
    model3DUrl: "https://example.com/models/modern-leather-sofa.glb"
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002", // Third UUID
    name: "Ergonomic Office Chair",
    price: "499.99",
    thumbnailUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
    dimensions: {
      width: 24,
      height: 36,
      depth: 24
    },
    model3DUrl: "https://example.com/models/office-chair.glb"
  }
];

// Sample todos for testing
export const seedTodos: NewTodo[] = [
  {
    title: "Set up AR product viewer",
    description: "Configure 3D model rendering for products",
    completed: false,
  },
  {
    title: "Test product database",
    description: "Ensure all products are properly seeded",
    completed: true,
  },
  {
    title: "Deploy to Kubernetes",
    description: "Set up K8s deployment for production",
    completed: false,
  }
];

// Test user for development/testing
// Login with: test@test.com / test123
export const seedUsers: Omit<NewUser, 'passwordHash'>[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440100",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  }
];

// Generic function to seed the database
export async function seedDatabase() {
  try {
    console.log('Seeding database...');
    
    // Seed test user first (needs password hashing)
    console.log('Seeding test user...');
    const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const testUserId = "550e8400-e29b-41d4-a716-446655440100";
    const usersWithHash: NewUser[] = seedUsers.map(user => ({
      ...user,
      passwordHash,
    }));
    await db.insert(schema.users).values(usersWithHash).onConflictDoNothing();
    console.log('✓ Test user seeded (test@test.com / test123)');
    
    // Seed products
    console.log('Seeding products...');
    await db.insert(schema.products).values(seedProducts).onConflictDoNothing();
    console.log('✓ Products seeded successfully');
    
    // Seed todos
    console.log('Seeding todos...');
    await db.insert(schema.todos).values(seedTodos).onConflictDoNothing();
    console.log('✓ Todos seeded successfully');
    
    // Seed family
    console.log('Seeding families...');
    const familyId = uuid();
    await db.insert(schema.families).values([
      {
        id: familyId,
        surname: "TestFamily",
        ownerId: testUserId,
        description: "A test family for development",
        avatarUrl: null,
      }
    ]).onConflictDoNothing();
    console.log('✓ Family seeded successfully');
    
    // Seed family member
    console.log('Seeding family members...');
    await db.insert(schema.familyMembers).values([
      {
        id: uuid(),
        familyId: familyId,
        userId: testUserId,
        role: 'admin',
        status: 'active',
        acceptedAt: new Date(),
      }
    ]).onConflictDoNothing();
    console.log('✓ Family member seeded successfully');
    
    // Seed posts
    console.log('Seeding posts...');
    const post1Id = uuid();
    const post2Id = uuid();
    const post3Id = uuid();
    
    await db.insert(schema.postsTable).values([
      {
        id: post1Id,
        familyId: familyId,
        authorId: testUserId,
        content: "Welcome to the family message board! This is a great place to share updates, photos, and stay connected with everyone.",
        parentPostId: null,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        id: post2Id,
        familyId: familyId,
        authorId: testUserId,
        content: "Looking forward to our family gathering next month! Who's interested in planning a video call?",
        parentPostId: null,
        status: 'active',
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
        updatedAt: new Date(Date.now() - 1800000),
      },
      {
        id: post3Id,
        familyId: familyId,
        authorId: testUserId,
        content: "That sounds great! I'd love to join a video call. How about next weekend?",
        parentPostId: post2Id,
        status: 'active',
        createdAt: new Date(Date.now() - 600000), // 10 minutes ago
        updatedAt: new Date(Date.now() - 600000),
      }
    ]).onConflictDoNothing();
    console.log('✓ Posts seeded successfully');
    
    // Seed announcements
    console.log('Seeding announcements...');
    await db.insert(schema.announcements).values([
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "Family Reunion - Save the Date!",
        content: "We're excited to announce our family reunion on March 15th! It will be a wonderful opportunity for everyone to gather, share stories, and create new memories together. More details coming soon. Please mark your calendars!",
        category: 'events',
        isPinned: true,
        priority: 2, // Urgent
        status: 'published',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        updatedAt: new Date(Date.now() - 7200000),
      },
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "Important: Grandma's Birthday Coming Up",
        content: "Don't forget! Grandma's 80th birthday is next month. We're planning a surprise celebration. Please let the admin know if you'd like to contribute ideas or participate in the planning.",
        category: 'milestones',
        isPinned: false,
        priority: 1,
        status: 'published',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "Weekly Video Call - Every Sunday at 6 PM",
        content: "Starting this Sunday, we'll have our weekly family video call at 6 PM EST. This is a great way to catch up with everyone, no matter where you are. All family members are welcome!",
        category: 'reminders',
        isPinned: false,
        priority: 0,
        status: 'published',
        createdAt: new Date(Date.now() - 900000), // 15 minutes ago
        updatedAt: new Date(Date.now() - 900000),
      },
      {
        id: uuid(),
        familyId: familyId,
        createdBy: testUserId,
        title: "Family News: New Baby Announcement!",
        content: "We're thrilled to share that our family has grown! Sarah and Mike welcome baby Emma, born February 8th, 2026. Mother and baby are doing wonderfully. Congratulations to the whole family!",
        category: 'family_news',
        isPinned: false,
        priority: 0,
        status: 'published',
        createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
        updatedAt: new Date(Date.now() - 1800000),
      },
    ]).onConflictDoNothing();
    console.log('✓ Announcements seeded successfully');
    
    // Seed calendar events
    console.log('Seeding calendar events...');
    const eventDates = [
      new Date(Date.now() + 86400000 * 7), // 7 days from now
      new Date(Date.now() + 86400000 * 14), // 14 days from now
      new Date(Date.now() + 86400000 * 35), // 35 days from now
    ];
    
    await db.insert(schema.calendarEvents).values([
      {
        id: uuid(),
        familyId: familyId,
        title: "Weekly Family Video Call",
        description: "Join us for our weekly family catch-up via Jitsi video call",
        startTime: eventDates[0],
        endTime: new Date(eventDates[0].getTime() + 3600000), // 1 hour duration
        location: "Virtual - Jitsi",
        createdBy: testUserId,
        visibility: 'family',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        title: "Grandma's 80th Birthday Celebration",
        description: "A special gathering to celebrate Grandma's milestone birthday with surprises and family traditions",
        startTime: eventDates[1],
        endTime: new Date(eventDates[1].getTime() + 28800000), // 8 hours duration
        location: "Family Home",
        createdBy: testUserId,
        visibility: 'family',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        title: "Annual Family Reunion",
        description: "Our big family reunion! Everyone come together for food, games, and bonding",
        startTime: eventDates[2],
        endTime: new Date(eventDates[2].getTime() + 86400000), // Full day event
        location: "State Park Pavilion",
        createdBy: testUserId,
        visibility: 'family',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]).onConflictDoNothing();
    console.log('✓ Calendar events seeded successfully');
    
    // Seed timeline highlights
    console.log('Seeding timeline highlights...');
    await db.insert(schema.timelineHighlights).values([
      {
        id: uuid(),
        familyId: familyId,
        title: "Baby Emma Arrives!",
        description: "Our family grew today with the arrival of beautiful baby Emma. Born February 8th, 2026. Welcome to the family, little one!",
        date: new Date(Date.now() - 86400000), // Yesterday
        createdBy: testUserId,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
      {
        id: uuid(),
        familyId: familyId,
        title: "Family Vacation in Hawaii",
        description: "Summer 2025 was unforgettable. We all gathered in Maui and made memories that will last a lifetime. Beach days, sunset dinners, and lots of laughter!",
        date: new Date(Date.now() - 86400000 * 200), // ~6 months ago
        createdBy: testUserId,
        createdAt: new Date(Date.now() - 86400000 * 200),
        updatedAt: new Date(Date.now() - 86400000 * 200),
      },
      {
        id: uuid(),
        familyId: familyId,
        title: "Grandpa's Retirement Party",
        description: "After 40 wonderful years, Grandpa retired! We celebrated his achievements and new chapter ahead. A true inspiration to us all.",
        date: new Date(Date.now() - 86400000 * 300), // ~10 months ago
        createdBy: testUserId,
        createdAt: new Date(Date.now() - 86400000 * 300),
        updatedAt: new Date(Date.now() - 86400000 * 300),
      },
    ]).onConflictDoNothing();
    console.log('✓ Timeline highlights seeded successfully');
    
    // Seed streaming sources
    console.log('Seeding streaming sources...');
    await db.insert(schema.streamingSources).values([
      {
        id: uuid(),
        familyId: familyId,
        name: "Pluto TV",
        url: "https://www.pluto.tv",
        type: "pluto",
        genre: "Movies",
        ageRating: 13,
        description: "Free streaming service with live TV channels and on-demand content",
        thumbnail: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=300&fit=crop",
        position: 0,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        name: "Tubi",
        url: "https://www.tubi.tv",
        type: "tubi",
        genre: "Movies",
        ageRating: 16,
        description: "Free ad-supported streaming platform with movies and TV shows",
        thumbnail: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop",
        position: 1,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        name: "Roku Channel",
        url: "https://www.roku.com",
        type: "roku",
        genre: "Entertainment",
        ageRating: 0,
        description: "Free streaming entertainment with movies, TV shows, and live channels",
        thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=400&h=300&fit=crop",
        position: 2,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        name: "Freeview",
        url: "https://www.freeview.com",
        type: "freeview",
        genre: "Television",
        ageRating: 13,
        description: "Free UK TV service with live channels and on-demand content",
        thumbnail: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=400&h=300&fit=crop",
        position: 3,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        name: "Classic Movies Collection",
        url: "https://example.com/classic-movies",
        type: "custom",
        genre: "Movies",
        ageRating: 0,
        description: "Curated collection of timeless classic films from the golden age of cinema",
        thumbnail: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop",
        position: 4,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        familyId: familyId,
        name: "Family Friendly Cartoons",
        url: "https://example.com/cartoons",
        type: "custom",
        genre: "Kids",
        ageRating: 0,
        description: "A selection of beloved animated shows perfect for the whole family",
        thumbnail: "https://images.unsplash.com/photo-1578375050091-50d01a47b098?w=400&h=300&fit=crop",
        position: 5,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]).onConflictDoNothing();
    console.log('✓ Streaming sources seeded successfully');
    
    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
// @ts-ignore - import.meta.main is a bun-specific API
if (import.meta.main) {
  seedDatabase().then(() => {
    console.log('Seeding completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
} 