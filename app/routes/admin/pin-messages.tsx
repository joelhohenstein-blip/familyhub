import { redirect } from "react-router";
import { callTrpc } from "../../utils/trpc.server";
import { PinMessagesPanel } from "../../components/admin/PinMessagesPanel";

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect("/login");
  }

  // TODO: Add admin role verification for the family
  // Admin role verification should be done at the component level
  // since different families may have different admins

  return { user };
}

export default function PinMessagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pin Messages</h1>
          <p className="text-gray-600 mt-2">
            Manage pinned messages in your family conversations
          </p>
        </div>
        <PinMessagesPanel />
      </div>
    </div>
  );
}
