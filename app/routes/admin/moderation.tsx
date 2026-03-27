import { redirect } from "react-router";
import { callTrpc } from "../../utils/trpc.server";
import { AdminDashboard } from "../../components/admin/AdminDashboard";
import { SidebarProvider } from "../../components/ui/sidebar";
import { AppSidebar } from "../../components/app-sidebar";
import { SiteHeader } from "../../components/site-header";
import { SidebarInset } from "../../components/ui/sidebar";
import React from "react";

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect("/login");
  }

  // TODO: Add admin role verification
  // if (user?.role !== "admin") {
  //   return redirect("/dashboard");
  // }

  return { user };
}

export default function ModerationPage() {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Admin" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
          <div className="max-w-7xl mx-auto px-4">
            <AdminDashboard />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
