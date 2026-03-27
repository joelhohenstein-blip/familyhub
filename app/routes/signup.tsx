import { redirect, data, Form, useNavigation } from 'react-router';
import { Heart } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { callTrpc } from '~/utils/trpc.server';
import type { Route } from './+types/signup';

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
  const confirmPassword = formData.get('confirm-password') as string;

  if (!email || !password) {
    return data({ error: 'Email and password are required' }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return data({ error: 'Passwords do not match' }, { status: 400 });
  }

  if (password.length < 8) {
    return data({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    const caller = await callTrpc(request);
    const result = await caller.auth.signup({ email, password });

    // Redirect to dashboard with session cookie
    return redirect('/dashboard', {
      headers: {
        'Set-Cookie': result.sessionCookie,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Signup failed';
    return data({ error: message }, { status: 400 });
  }
}

export default function SignupPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const error = actionData?.error;

  return (
    <div className="bg-gradient-to-b from-orange-50 via-rose-50 to-teal-50 flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className={cn('flex flex-col gap-6')}>
          <div className="flex justify-center gap-2 mb-4">
            <a href="/" className="flex items-center gap-2 font-bold text-2xl">
              <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white flex size-8 items-center justify-center rounded-md">
                <Heart className="size-5" />
              </div>
              <span className="bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
                FamilyHub
              </span>
            </a>
          </div>

          <Card className="overflow-hidden p-0 border-0 shadow-lg">
            <CardContent className="grid p-0 md:grid-cols-2">
              <Form method="post" className="p-6 md:p-8 bg-white">
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Join FamilyHub</h1>
                    <p className="text-gray-600 text-sm text-balance">
                      Create your account to start connecting with family
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200 text-center">
                      {error}
                    </div>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="rounded-lg"
                    />
                    <FieldDescription>
                      We&apos;ll use this to keep your account secure. No spam, ever.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <Field className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          autoComplete="new-password"
                          className="rounded-lg"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="confirm-password">
                          Confirm
                        </FieldLabel>
                        <Input
                          id="confirm-password"
                          name="confirm-password"
                          type="password"
                          required
                          autoComplete="new-password"
                          className="rounded-lg"
                        />
                      </Field>
                    </Field>
                    <FieldDescription>
                      At least 8 characters for security.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white rounded-lg h-11 font-semibold w-full"
                    >
                      {isSubmitting ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </Field>
                  <FieldSeparator>or sign up with</FieldSeparator>
                  <Field className="grid grid-cols-2 gap-4">
                    <a href="/auth/github">
                      <Button variant="outline" type="button" className="h-10 w-full rounded-lg border-gray-300 hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
                          <path
                            d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                            fill="currentColor"
                          />
                        </svg>
                        GitHub
                      </Button>
                    </a>
                    <a href="/auth/google">
                      <Button variant="outline" type="button" className="h-10 w-full rounded-lg border-gray-300 hover:bg-gray-50">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
                          <path
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                            fill="currentColor"
                          />
                        </svg>
                        Google
                      </Button>
                    </a>
                  </Field>
                  <FieldDescription className="text-center text-gray-700">
                    Already have an account?{' '}
                    <a href="/login" className="text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-4">
                      Sign in
                    </a>
                  </FieldDescription>
                </FieldGroup>
              </Form>
              <div className="hidden md:block bg-gradient-to-br from-orange-400 via-rose-400 to-teal-400" />
            </CardContent>
          </Card>
          <FieldDescription className="px-6 text-center text-gray-600">
            By creating an account, you agree to our <a href="#" className="text-orange-600 hover:text-orange-700 underline">Terms of Service</a>{' '}
            and <a href="#" className="text-orange-600 hover:text-orange-700 underline">Privacy Policy</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
