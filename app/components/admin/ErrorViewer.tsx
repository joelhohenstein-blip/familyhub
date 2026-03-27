import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

interface ErrorLog {
  id: number;
  timestamp: Date | string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string | null;
  json_payload?: Record<string, any> | null;
  service?: string | null;
  env?: string | null;
  metadata?: Record<string, any> | null;
}

interface ErrorViewerProps {
  errors: ErrorLog[];
  total: number;
}

export function ErrorViewer({ errors, total }: ErrorViewerProps) {
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");

  const filteredErrors = filterLevel === "all" 
    ? errors 
    : errors.filter(e => e.level === filterLevel);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 border-red-300 dark:border-red-700";
      case "warn":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700";
      case "info":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 border-blue-300 dark:border-blue-700";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600";
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Log Viewer</CardTitle>
        <CardDescription>
          Total errors in last 60 minutes: {total}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>
        </div>

        {/* Error List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredErrors.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No errors found
            </p>
          ) : (
            filteredErrors.map((error) => (
              <div
                key={error.id}
                onClick={() => setSelectedError(error)}
                className={`p-3 border rounded-lg cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedError?.id === error.id
                    ? "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getLevelColor(error.level)}`}>
                    {error.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {error.message}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {formatDate(error.timestamp)}
                    </p>
                    {error.service && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Service: {error.service}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail View */}
        {selectedError && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Error Details</h4>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">Message</p>
                <p className="text-gray-900 dark:text-white break-words">{selectedError.message}</p>
              </div>

              {selectedError.stack && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Stack Trace</p>
                  <pre className="text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-xs">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 font-medium">Metadata</p>
                  <pre className="text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-xs">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-4 text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                {selectedError.service && <span>Service: {selectedError.service}</span>}
                {selectedError.env && <span>Env: {selectedError.env}</span>}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
