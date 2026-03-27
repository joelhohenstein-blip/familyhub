import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { pusher } from '~/utils/pusher.server';

/**
 * Pusher authentication endpoint for private channels
 * This endpoint is called by the Pusher client when subscribing to a private channel
 */
async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { socket_id, channel_name } = body;

    if (!socket_id || !channel_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate the Pusher channel subscription
    // In production, you would also verify the user has permission to access this channel
    const auth = pusher.authorizeChannel(socket_id, channel_name);

    return new Response(JSON.stringify(auth), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Pusher auth error:', error);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  return handler(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return handler(request);
}
