import { useState } from "react";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { trpc } from "../../utils/trpc";

export function BillingPortalButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessPortal = trpc.billing.accessBillingPortal.useMutation({
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      setIsLoading(false);
      setError(error.message || "Failed to access billing portal");
    },
  });

  return (
    <div>
      <Button
        onClick={() => accessPortal.mutate()}
        disabled={isLoading}
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          "Manage Billing"
        )}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
