import { db } from '"'"'./app/db/index.server'"'"';
import { photoDigitizationOrders } from '"'"'./app/db/schema/photoDigitizationOrders'"'"';

async function createTestOrders() {
  try {
    const result = await db.insert(photoDigitizationOrders).values([
      {
        customerId: '"'"'test-customer-1'"'"',
        status: '"'"'inquiry_submitted'"'"',
        itemType: '"'"'loose_slides'"'"',
        quantity: 500,
        estimatedPrice: '"'"'150.00'"'"',
        customerEmail: '"'"'john@example.com'"'"',
        customerPhone: '"'"'555-1234'"'"',
        notes: '"'"'Test order 1'"'"',
      },
      {
        customerId: '"'"'test-customer-2'"'"',
        status: '"'"'quantity_verified'"'"',
        itemType: '"'"'carousel'"'"',
        quantity: 300,
        estimatedPrice: '"'"'200.00'"'"',
        customerEmail: '"'"'jane@example.com'"'"',
        customerPhone: '"'"'555-5678'"'"',
        notes: '"'"'Test order 2'"'"',
      },
    ]).returning();
    
    console.log('"'"'Test orders created:'"'"', result);
  } catch (error) {
    console.error('"'"'Error creating test orders:'"'"', error);
  }
}

createTestOrders();
ENDOFFILE
npx tsx create_test_orders.ts 2>&1
