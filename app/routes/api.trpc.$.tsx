import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { createContext } from '~/server/trpc/context';
import { appRouter } from '~/server/trpc/root';

// Common handler for both GET and POST requests
const handler = async (request: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => createContext({ request }),
  });
};

// Handle tRPC queries (GET requests)
export async function loader(args: LoaderFunctionArgs) {
  return handler(args.request);
}

// Handle tRPC mutations (POST requests)
export async function action(args: ActionFunctionArgs) {
  return handler(args.request);
} 