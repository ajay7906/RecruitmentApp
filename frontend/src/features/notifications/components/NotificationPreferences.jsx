import { useState, useEffect } from "react";
import { Lock, Mail, Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";

export function NotificationPreferences() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    notificationsApi
      .getPreferences()
      .then((res) => {
        if (mounted) setItems(res?.preferences || []);
      })
      .catch(() => {
        toast.error("Could not load notification preferences");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function togglePreference(category, channel) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.category !== category || item.isEssential) return item;
        return {
          ...item,
          channels: {
            ...item.channels,
            [channel]: !item.channels[channel],
          },
        };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = [];
      for (const item of items) {
        if (item.isEssential) continue;
        payload.push(
          {
            category: item.category,
            channel: "EMAIL",
            enabled: Boolean(item.channels.EMAIL),
          },
          {
            category: item.category,
            channel: "IN_APP",
            enabled: Boolean(item.channels.IN_APP),
          }
        );
      }
      const res = await notificationsApi.updatePreferences(payload);
      setItems(res?.preferences || items);
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="grid grid-cols-12 items-center border-b border-slate-100 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-6 sm:col-span-8">Notification Category</div>
          <div className="col-span-3 flex items-center justify-center gap-1 sm:col-span-2">
            <Mail size={14} /> Email
          </div>
          <div className="col-span-3 flex items-center justify-center gap-1 sm:col-span-2">
            <Bell size={14} /> In-App
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.category}
              className="grid grid-cols-12 items-center gap-4 px-6 py-4"
            >
              <div className="col-span-6 sm:col-span-8">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">
                    {item.label}
                  </p>
                  {item.isEssential && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      <Lock size={10} /> Required
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.description}
                </p>
              </div>

              <div className="col-span-3 flex justify-center sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(item.channels?.EMAIL)}
                  disabled={item.isEssential}
                  onChange={() => togglePreference(item.category, "EMAIL")}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-50"
                />
              </div>

              <div className="col-span-3 flex justify-center sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(item.channels?.IN_APP)}
                  disabled={item.isEssential}
                  onChange={() => togglePreference(item.category, "IN_APP")}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving Preferences..." : "Save Notification Preferences"}
        </button>
      </div>
    </div>
  );
}
