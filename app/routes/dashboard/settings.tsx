import { redirect } from "react-router";
import { callTrpc } from "../../utils/trpc.server";
import { SettingsLayout } from "../../components/settings/SettingsLayout";

export async function loader({ request }: { request: Request }) {
  const caller = await callTrpc(request);
  const { isSignedIn, user } = await caller.auth.me();

  if (!isSignedIn) {
    return redirect("/login");
  }

  return { user };
}

export default function SettingsPage() {
  return <SettingsLayout />;
}
