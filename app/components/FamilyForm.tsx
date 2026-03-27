import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FamilyFormProps {
  onSubmit: (data: {
    surname: string;
    description?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  loading?: boolean;
  error?: string;
  initialValues?: {
    surname?: string;
    description?: string;
    avatarUrl?: string;
  };
}

export function FamilyForm({
  onSubmit,
  loading = false,
  error,
  initialValues = {},
}: FamilyFormProps) {
  const { t } = useTranslation();
  const [surname, setSurname] = useState(initialValues.surname || "");
  const [description, setDescription] = useState(
    initialValues.description || ""
  );
  const [avatarUrl, setAvatarUrl] = useState(initialValues.avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialValues.avatarUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string>(error || "");

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setAvatarUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!surname.trim()) {
      setFormError("Surname is required");
      return;
    }

    try {
      await onSubmit({
        surname: surname.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "An error occurred"
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(formError || error) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {formError || error}
        </div>
      )}

      {/* Avatar Upload */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {t("family.avatar") || "Family Avatar"}
        </label>
        {avatarPreview ? (
          <div className="relative w-24 h-24">
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="w-full h-full rounded-lg object-cover border-2 border-orange-200"
            />
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center cursor-pointer hover:bg-orange-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Click to upload family avatar
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {/* Surname */}
      <div className="space-y-2">
        <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
          {t("family.surname") || "Family Surname"} *
        </label>
        <input
          id="surname"
          type="text"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder="e.g., Smith"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
          disabled={loading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          {t("family.description") || "Family Description"}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about your family..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
          disabled={loading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 text-white font-semibold bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}
