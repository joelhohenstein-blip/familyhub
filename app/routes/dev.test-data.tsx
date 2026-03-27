import type { Route } from './+types/dev.test-data';
import { db } from '~/db/index.server';
import { photoDigitizationOrders } from '~/db/schema/photoDigitizationOrders';

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const result = await db.insert(photoDigitizationOrders).values([
      {
        customerId: 'test-customer-1',
        status: 'inquiry_submitted',
        itemType: 'loose_slides',
        quantity: 500,
        estimatedPrice: '150.00',
        customerEmail: 'john@example.com',
        customerPhone: '555-1234',
        notes: 'Test order 1',
      },
      {
        customerId: 'test-customer-2',
        status: 'quantity_verified',
        itemType: 'carousel',
        quantity: 300,
        estimatedPrice: '200.00',
        customerEmail: 'jane@example.com',
        customerPhone: '555-5678',
        notes: 'Test order 2',
      },
      {
        customerId: 'test-customer-3',
        status: 'payment_pending',
        itemType: 'loose_slides',
        quantity: 1000,
        estimatedPrice: '350.00',
        customerEmail: 'bob@example.com',
        customerPhone: '555-9999',
        notes: 'Test order 3',
      },
      {
        customerId: 'test-customer-4',
        status: 'payment_confirmed',
        itemType: 'carousel',
        quantity: 200,
        estimatedPrice: '100.00',
        customerEmail: 'alice@example.com',
        customerPhone: '555-4444',
        notes: 'Test order 4',
      },
    ]).returning();

    return new Response(JSON.stringify({ success: true, orders: result }), { status: 200 });
  } catch (error) {
    console.error('Error creating test orders:', error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
}

export default function TestDataPage() {
  return (
    <div>
      <h1>Test Data Creation</h1>
      <form method="POST">
        <button type="submit">Create Test Orders</button>
      </form>
    </div>
  );
}
