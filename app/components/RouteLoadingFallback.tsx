import { Loader2 } from "lucide-react";

export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  );
}
