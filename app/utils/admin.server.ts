import { redirect } from "react-router";
import type { SafeUser } from "../db/schema/auth";

/**
 * Middleware to verify admin role on server-side routes
 * Use this in loader functions to protect admin routes
 * 
 * @param user - The authenticated user object
 * @param redirectTo - Where to redirect if not admin (default: /dashboard)
 * @throws Redirects to login if user is null
 * @throws Redirects to dashboard if user is not admin
 */
export function requireAdmin(user: SafeUser | null, redirectTo: string = "/dashboard") {
  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "admin") {
    return redirect(redirectTo);
  }

  return user;
}

/**
 * Check if a user has admin role (returns boolean)
 * Use this for conditional logic instead of throwing redirects
 */
export function isAdmin(user: SafeUser | null): boolean {
  return user?.role === "admin";
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: SafeUser | null, role: string): boolean {
  return user?.role === role;
}
