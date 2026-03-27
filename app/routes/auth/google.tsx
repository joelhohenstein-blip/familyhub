import { redirect } from 'react-router';
import { generateState, generateCodeVerifier } from 'arctic';
import { google, createStateCookie, createCodeVerifierCookie } from '~/server/oauth.server';
import type { Route } from './+types/google';

export async function loader({ request }: Route.LoaderArgs) {
  if (!google) {
    throw new Response('Google OAuth not configured', { status: 500 });
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ['openid', 'email', 'profile']);

  return redirect(url.toString(), {
    headers: [
      ['Set-Cookie', createStateCookie(state)],
      ['Set-Cookie', createCodeVerifierCookie(codeVerifier)],
    ],
  });
}
