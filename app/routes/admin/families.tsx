import { redirect } from "react-router";
import { callTrpc } from "../../utils/trpc.server";
import { MemberManagementPanel } from "../../components/admin/MemberManagementPanel";

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

export default function FamiliesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Member Management</h1>
          <p className="text-gray-600 mt-2">
            Manage family members and control their access to FamilyHub features
          </p>
        </div>
        <MemberManagementPanel />
      </div>
    </div>
  );
}
