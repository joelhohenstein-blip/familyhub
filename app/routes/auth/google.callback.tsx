import { redirect } from 'react-router';
import { decodeIdToken } from 'arctic';
import { google, handleOAuthCallback, parseCookies, clearOAuthCookies } from '~/server/oauth.server';
import type { Route } from './+types/google.callback';

interface GoogleIdTokenClaims {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!google) {
    throw new Response('Google OAuth not configured', { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const storedState = cookies['oauth_state'];
  const codeVerifier = cookies['oauth_code_verifier'];

  // Validate state
  if (!code || !state || state !== storedState || !codeVerifier) {
    return redirect('/login?error=invalid_state');
  }

  try {
    // Exchange code for tokens
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);

    // Decode ID token to get user info
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken) as { payload: GoogleIdTokenClaims };
    const googleUser = claims.payload;

    if (!googleUser.email) {
      return redirect('/login?error=no_email');
    }

    // Create or link account and get session cookie
    const sessionCookie = await handleOAuthCallback('google', googleUser.sub, {
      email: googleUser.email,
      name: googleUser.name || `${googleUser.given_name || ''} ${googleUser.family_name || ''}`.trim(),
      avatarUrl: googleUser.picture,
    });

    // Clear OAuth cookies and set session
    const clearCookies = clearOAuthCookies();

    return redirect('/dashboard', {
      headers: [
        ['Set-Cookie', sessionCookie],
        ...clearCookies.map(c => ['Set-Cookie', c] as [string, string]),
      ],
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return redirect('/login?error=oauth_failed');
  }
}
