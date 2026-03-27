import { redirect, data, Form, useNavigation } from 'react-router';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { LanguageToggle } from '~/components/LanguageToggle';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { callTrpc } from '~/utils/trpc.server';
import type { Route } from './+types/login';

export async function loader({ request }: Route.LoaderArgs) {
  // If already logged in, redirect to dashboard
  const caller = await callTrpc(request);
  const session = await caller.auth.me();
  if (session.isSignedIn) {
    return redirect('/dashboard');
  }
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return data({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const caller = await callTrpc(request);
    const result = await caller.auth.login({ email, password });

    // Redirect to dashboard with session cookie
    return redirect('/dashboard', {
      headers: {
        'Set-Cookie': result.sessionCookie,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return data({ error: message }, { status: 401 });
  }
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const error = actionData?.error;
  const { t } = useTranslation();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-gradient-to-b from-orange-50 to-rose-50">
        <div className="flex justify-between items-center gap-2">
          <a href="/" className="flex items-center gap-2 font-bold text-2xl cursor-pointer hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white flex size-8 items-center justify-center rounded-md">
              <Heart className="size-5" />
            </div>
            <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-rose-400">
              FamilyHub
            </span>
          </a>
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className={cn('flex flex-col gap-6')}>
              <Form method="post" className="flex flex-col gap-6">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('login.welcome')}</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm text-balance">
                      {t('login.subtitle')}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 text-center">
                      {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">{t('login.email')}</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="rounded-lg"
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">{t('login.password')}</FieldLabel>
                      <a
                        href="#"
                        className="ml-auto text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline-offset-4 hover:underline cursor-pointer transition-colors"
                      >
                        {t('login.forgotPassword')}
                      </a>
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="rounded-lg"
                    />
                  </Field>
                  <Field>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-lg h-11 font-semibold"
                    >
                      {isSubmitting ? t('common.loading') : t('login.signIn')}
                    </Button>
                  </Field>
                  <FieldSeparator>or continue with</FieldSeparator>
                  <Field className="grid grid-cols-2 gap-4">
                    <a href="/auth/github" className="cursor-pointer">
                      <Button variant="outline" type="button" className="h-11 w-full rounded-lg border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
                          <path
                            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                            fill="currentColor"
                          />
                        </svg>
                        GitHub
                      </Button>
                    </a>
                    <a href="/auth/google" className="cursor-pointer">
                      <Button variant="outline" type="button" className="h-11 w-full rounded-lg border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5 mr-2">
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        Google
                      </Button>
                    </a>
                  </Field>
                  <Field>
                    <FieldDescription className="text-center text-gray-700 dark:text-gray-300">
                      {t('login.noAccount')}{' '}
                      <a href="/signup" className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold underline underline-offset-4 cursor-pointer transition-colors">
                        {t('login.signUp')}
                      </a>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </Form>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden lg:block bg-gradient-to-br from-orange-400 via-rose-400 to-teal-400" />
    </div>
  );
}
