import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { trpc } from "../../utils/trpc";
import { Loader2, Copy, Trash2, RotateCw, Plus, Check } from "lucide-react";

export function APIKeysManager() {
  const listKeysQuery = trpc.settings.listApiKeys.useQuery();
  const createKeyMutation = trpc.settings.createApiKey.useMutation();
  const revokeKeyMutation = trpc.settings.revokeApiKey.useMutation();
  const rotateKeyMutation = trpc.settings.rotateApiKey.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createKeyMutation.mutateAsync({
        name: keyName,
        scopes: ["read", "write"],
      });
      setGeneratedKey(`sk_${result.keyHash}`);
      setKeyName("");
      listKeysQuery.refetch();
    } catch (error) {
      console.error("Failed to create API key:", error);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) {
      try {
        await revokeKeyMutation.mutateAsync({ keyId });
        listKeysQuery.refetch();
      } catch (error) {
        console.error("Failed to revoke API key:", error);
      }
    }
  };

  const handleRotate = async (keyId: number) => {
    if (confirm("Rotating this key will generate a new one. Update your applications to use the new key.")) {
      try {
        await rotateKeyMutation.mutateAsync({ keyId });
        listKeysQuery.refetch();
      } catch (error) {
        console.error("Failed to rotate API key:", error);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (listKeysQuery.isLoading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    );
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">API Keys</h2>
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Key
            </Button>
          )}
        </div>

        {/* Create Key Form */}
        {showForm && (
          <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New API Key</h3>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Integration"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={createKeyMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {createKeyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Key"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-slate-300 hover:bg-slate-400 text-slate-900"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Generated Key Display */}
        {generatedKey && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-3">
              ✓ Your API key has been created. Copy it now - you won't see it again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-sm">
                {generatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="p-2 hover:bg-green-100 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-green-600" />
                )}
              </button>
            </div>
            <Button
              onClick={() => setGeneratedKey(null)}
              className="mt-3 bg-green-600 hover:bg-green-700 text-white"
            >
              Done
            </Button>
          </div>
        )}

        {/* API Keys List */}
        <div className="space-y-3">
          {listKeysQuery.data && listKeysQuery.data.length > 0 ? (
            listKeysQuery.data.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{key.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-600 font-mono">
                      {key.keyHash}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.keyHash)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.revokedAt && ` • Revoked ${new Date(key.revokedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!key.revokedAt && (
                    <>
                      <button
                        onClick={() => handleRotate(key.id)}
                        disabled={rotateKeyMutation.isPending}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Rotate key"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revokeKeyMutation.isPending}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No API keys yet. Create one to get started!</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
