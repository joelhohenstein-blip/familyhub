import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(
    JSON.stringify({
      pusher: {
        key: process.env.PUSHER_KEY || '',
        cluster: process.env.PUSHER_CLUSTER || 'mt1',
      },
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
