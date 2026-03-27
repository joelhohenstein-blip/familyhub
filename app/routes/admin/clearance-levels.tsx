import { redirect } from "react-router";
import { callTrpc } from "../../utils/trpc.server";
import { ClearanceLevelManagementPanel } from "../../components/admin/ClearanceLevelManagementPanel";

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect("/login");
  }

  // Check if user is admin
  if (user?.role !== "admin") {
    return redirect("/dashboard");
  }

  return { user };
}

export default function ClearanceLevelsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <ClearanceLevelManagementPanel />
      </div>
    </div>
  );
}
