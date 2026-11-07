import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { ActivityTimeline } from "../components/ActivityTimeline";

export function AdminActivitiesPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listActivities({
        q: q || undefined,
        type: type || undefined,
        ...dateFilter,
        limit: 50,
      });
      setActivities(res?.activities || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load platform activities");
    } finally {
      setLoading(false);
    }
  }, [q, type, dateFilter]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Activities Timeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Unified event stream across user registrations, companies, jobs, applications, interviews, and moderation actions.
          </p>
        </div>
        <DateRangeFilter
          range={dateFilter.range}
          from={dateFilter.from}
          to={dateFilter.to}
          onChange={setDateFilter}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AdminSearch
          value={q}
          onChange={setQ}
          placeholder="Filter events by keyword, user, company, or job title..."
        />
        <AdminFilters
          values={{ type }}
          onChange={(_, val) => setType(val)}
          onReset={() => {
            setQ("");
            setType("");
          }}
          filters={[
            {
              key: "type",
              label: "Category",
              options: [
                { value: "ADMIN_AUDIT", label: "Administrative Actions" },
                { value: "USER_REGISTRATION", label: "User Registrations" },
                { value: "COMPANY", label: "Company Events" },
                { value: "JOB", label: "Job Events" },
                { value: "APPLICATION", label: "Applications" },
                { value: "INTERVIEW", label: "Interviews" },
              ],
            },
          ]}
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading platform activity feed...
        </div>
      ) : (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  );
}
