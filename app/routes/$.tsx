import { Code2, Home } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useLocation } from 'react-router';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-6">
          <Code2 className="w-6 h-6 text-muted-foreground" />
        </div>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          Route not implemented
        </h1>

        <p className="text-sm text-muted-foreground mb-4">
          This page hasn't been built yet. Ask the coding agent to implement it.
        </p>

        <div className="mb-6 p-3 bg-muted rounded-md text-xs font-mono text-muted-foreground">
          {location.pathname}
        </div>

        <Button
          onClick={() => (window.location.href = '/')}
          variant="outline"
          size="sm"
        >
          <Home className="w-3.5 h-3.5 mr-1.5" />
          Home
        </Button>
      </div>
    </div>
  );
}
