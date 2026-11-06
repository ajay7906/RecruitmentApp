import { useRef, useState } from "react";
import { Building2, Upload, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/Button";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function CompanyLogoUpload({
  value,
  onChange,
  disabled = false,
  error,
}) {
  const fileInputRef = useRef(null);
  const [urlMode, setUrlMode] = useState(false);

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file format. Please upload a PNG, JPG, WEBP, or SVG image.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Logo file size must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => {
      toast.error("Could not read image file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
          {value ? (
            <img
              src={value}
              alt="Company logo preview"
              className="h-full w-full object-contain p-1.5"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Building2 size={28} />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={disabled}
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              className="gap-2 px-3 py-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              Upload logo
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="gap-1.5 px-3 py-2 text-xs"
              onClick={() => setUrlMode((prev) => !prev)}
            >
              <Link2 size={14} />
              {urlMode ? "Hide URL input" : "Use image URL"}
            </Button>

            {value && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                className="gap-1.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                onClick={() => onChange("")}
              >
                <Trash2 size={14} />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            PNG, JPG, WEBP, or SVG. Maximum file size 2 MB.
          </p>
        </div>
      </div>

      {urlMode && (
        <input
          type="url"
          value={value?.startsWith("data:") ? "" : value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="https://example.com/logo.png"
          className={profileInputClass}
        />
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
