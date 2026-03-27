#!/usr/bin/env node
/**
 * Script to create test families with members for multi-tenant testing
 * Run with: bun scripts/create-test-families.ts
 */

import { db } from '../app/db/index.server';
import { users, families, familyMembers, postsTable } from '../app/db/schema';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';

// Define test families with members
const testFamilies = [
  {
    surname: 'TestAnderson',
    description: 'The Anderson family - enjoys outdoor activities',
    users: [
      { email: 'john.anderson.test@example.com', firstName: 'John', lastName: 'Anderson', role: 'admin' as const },
      { email: 'sarah.anderson.test@example.com', firstName: 'Sarah', lastName: 'Anderson', role: 'member' as const },
      { email: 'emma.anderson.test@example.com', firstName: 'Emma', lastName: 'Anderson', role: 'member' as const },
    ]
  },
  {
    surname: 'TestSmith',
    description: 'The Smith family - tech enthusiasts',
    users: [
      { email: 'robert.smith.test@example.com', firstName: 'Robert', lastName: 'Smith', role: 'admin' as const },
      { email: 'alice.smith.test@example.com', firstName: 'Alice', lastName: 'Smith', role: 'member' as const },
      { email: 'charlie.smith.test@example.com', firstName: 'Charlie', lastName: 'Smith', role: 'member' as const },
    ]
  },
  {
    surname: 'TestJohnson',
    description: 'The Johnson family - foodies and travelers',
    users: [
      { email: 'david.johnson.test@example.com', firstName: 'David', lastName: 'Johnson', role: 'admin' as const },
      { email: 'linda.johnson.test@example.com', firstName: 'Linda', lastName: 'Johnson', role: 'member' as const },
      { email: 'george.johnson.test@example.com', firstName: 'George', lastName: 'Johnson', role: 'member' as const },
    ]
  },
];

async function createTestFamilies() {
  console.log('🚀 Creating test families...\n');

  const password = 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  let totalUsersCreated = 0;
  let totalFamiliesCreated = 0;

  for (const familyData of testFamilies) {
    console.log(`\n📍 Creating family: ${familyData.surname}`);
    
    // Create users for this family
    const familyUserIds: { id: string; email: string; firstName: string; lastName: string; role: 'admin' | 'member' }[] = [];
    
    for (const userData of familyData.users) {
      const userId = uuid();
      
      try {
        // Create user
        await db.insert(users).values({
          id: userId,
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        
        familyUserIds.push({
          id: userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role
        });
        
        console.log(`  ✓ Created user: ${userData.email}`);
        totalUsersCreated++;
      } catch (error) {
        // User might already exist
        const existing = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, userData.email),
        });
        
        if (existing) {
          familyUserIds.push({
            id: existing.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role
          });
          console.log(`  ℹ️  User already exists: ${userData.email}`);
        }
      }
    }

    // Create family
    const familyId = uuid();
    const adminUser = familyUserIds.find(u => u.role === 'admin')!;
    
    try {
      await db.insert(families).values({
        id: familyId,
        surname: familyData.surname,
        ownerId: adminUser.id,
        description: familyData.description,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${familyData.surname}`,
      });

      console.log(`  ✓ Created family: ${familyData.surname}`);
      totalFamiliesCreated++;
    } catch (error) {
      console.log(`  ℹ️  Family already exists: ${familyData.surname}`);
      continue;
    }

    // Add users as family members
    for (const user of familyUserIds) {
      try {
        await db.insert(familyMembers).values({
          id: uuid(),
          familyId,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: 'active',
          acceptedAt: new Date(),
        });
      } catch (error) {
        // Member might already exist
      }
    }

    console.log(`  ✓ Added ${familyUserIds.length} members to family`);

    // Create sample messages for this family (so they have different data)
    const messages = [
      `Welcome to ${familyData.surname} FamilyHub! 👋`,
      `Don't forget the ${familyData.surname} family dinner this Sunday! 🍽️`,
      `Check out our latest family photos in the Media section 📸`,
      `${familyData.surname} family achievements for this month! 🎉`,
    ];

    for (const message of messages) {
      try {
        await db.insert(postsTable).values({
          id: uuid(),
          familyId,
          authorId: adminUser.id,
          content: message,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        // Ignore conflicts
      }
    }

    console.log(`  ✓ Added ${messages.length} sample messages`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test data creation complete!');
  console.log('='.repeat(60));
  console.log(`\nCreated:`);
  console.log(`  • ${totalFamiliesCreated} families`);
  console.log(`  • ${totalUsersCreated} users`);
  console.log('\n📝 Test Credentials (try logging in with any of these):\n');

  for (const family of testFamilies) {
    console.log(`\n${family.surname} Family:`);
    for (const user of family.users) {
      console.log(`  • Email: ${user.email}`);
      console.log(`    Password: TestPassword123!`);
      console.log(`    Role: ${user.role}\n`);
    }
  }

  console.log('\n🎯 What to do next:');
  console.log('  1️⃣  Login with any of the test credentials above');
  console.log('  2️⃣  Look in the SIDEBAR (top-left) for the Family Switcher');
  console.log('     It shows the current family name (e.g., "TestAnderson")');
  console.log('  3️⃣  Click on it to see a dropdown of all families');
  console.log('  4️⃣  Switch between families and notice:');
  console.log('     • Different members in the Members section');
  console.log('     • Different messages on the dashboard');
  console.log('     • Different page title (e.g., "TestSmith FamilyHub Dashboard")');
  console.log('  5️⃣  Try accessing message board, timeline, calendar, etc.');
  console.log('     Each family has completely isolated data!\n');

  process.exit(0);
}

createTestFamilies().catch((error) => {
  console.error('❌ Error creating test families:', error);
  process.exit(1);
});
