import { redirect } from 'react-router';
import { github, handleOAuthCallback, parseCookies, clearOAuthCookies } from '~/server/oauth.server';
import type { Route } from './+types/github.callback';

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function loader({ request }: Route.LoaderArgs) {
  if (!github) {
    throw new Response('GitHub OAuth not configured', { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const storedState = cookies['oauth_state'];

  // Validate state
  if (!code || !state || state !== storedState) {
    return redirect('/login?error=invalid_state');
  }

  try {
    // Exchange code for tokens
    const tokens = await github.validateAuthorizationCode(code);

    // Fetch user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        'User-Agent': 'remix-app',
      },
    });
    const githubUser: GitHubUser = await userResponse.json();

    // Get email (might need separate request if email is private)
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          'User-Agent': 'remix-app',
        },
      });
      const emails: GitHubEmail[] = await emailResponse.json();
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      return redirect('/login?error=no_email');
    }

    // Create or link account and get session cookie
    const sessionCookie = await handleOAuthCallback('github', String(githubUser.id), {
      email,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url,
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
    console.error('GitHub OAuth error:', error);
    return redirect('/login?error=oauth_failed');
  }
}
