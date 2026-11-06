import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { jobsApi } from "../api/jobsApi";
import {
  employmentTypeOptions,
  workModeOptions,
} from "../schema/jobSchemas";
import { JobSearch } from "../components/JobSearch";
import { JobCard } from "../components/JobCard";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { useAuthStore } from "../../../stores/authStore";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

const filterInputClass =
  "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand focus:bg-white";

const initialFilters = {
  skill: "",
  location: "",
  industry: "",
  employmentType: "ALL",
  workMode: "ALL",
  minExperience: "",
  maxExperience: "",
  minSalary: "",
  sortBy: "publishedAt",
  sortOrder: "desc",
};

export function JobsPage() {
  const user = useAuthStore((s) => s.user);
  const locationObj = useLocation();
  const isPublicRoute = !locationObj.pathname.startsWith("/app");
  const linkPrefix = isPublicRoute ? "/jobs" : "/app/jobs";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedSkill = useDebouncedValue(filters.skill, 300);
  const debouncedLocation = useDebouncedValue(filters.location, 300);
  const debouncedIndustry = useDebouncedValue(filters.industry, 300);

  const query = useQuery({
    queryKey: [
      "jobs",
      "public",
      {
        q: debouncedSearch,
        skill: debouncedSkill,
        location: debouncedLocation,
        industry: debouncedIndustry,
        employmentType: filters.employmentType,
        workMode: filters.workMode,
        minExperience: filters.minExperience,
        maxExperience: filters.maxExperience,
        minSalary: filters.minSalary,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
      },
    ],
    queryFn: () =>
      jobsApi.listPublic({
        q: debouncedSearch || undefined,
        skill: debouncedSkill || undefined,
        location: debouncedLocation || undefined,
        industry: debouncedIndustry || undefined,
        employmentType:
          filters.employmentType !== "ALL" ? filters.employmentType : undefined,
        workMode: filters.workMode !== "ALL" ? filters.workMode : undefined,
        minExperience:
          filters.minExperience !== "" ? filters.minExperience : undefined,
        maxExperience:
          filters.maxExperience !== "" ? filters.maxExperience : undefined,
        minSalary: filters.minSalary !== "" ? filters.minSalary : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        limit: 10,
      }),
    retry: false,
  });

  const jobs =
    query.data?.data?.jobs ?? query.data?.jobs ?? [];
  const pagination = query.data?.data?.pagination ?? {
    total: jobs.length,
    page: 1,
    totalPages: 1,
  };

  function updateFilter(key, val) {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  }

  function resetAllFilters() {
    setSearch("");
    setFilters(initialFilters);
    setPage(1);
  }

  const isRecruiterOrAdmin =
    user?.role === "recruiter" || user?.role === "admin";

  return (
    <div className={isPublicRoute ? "mx-auto max-w-7xl px-5 py-10 lg:px-8" : ""}>
      {/* Recruiter quick banner when viewing public job board */}
      {isRecruiterOrAdmin && !isPublicRoute && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 px-5 py-3.5">
          <p className="text-sm font-medium text-slate-800">
            Viewing the public candidate job board. Switch to your recruiter
            workspace to manage vacancies.
          </p>
          <div className="flex items-center gap-2">
            <Link
              to="/app/jobs/manage"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-brand shadow-sm hover:bg-blue-50"
            >
              <LayoutDashboard size={14} />
              Job Dashboard
            </Link>
            <Link
              to="/app/jobs/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={14} />
              Create Job
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <p className="text-sm font-medium text-brand">OPPORTUNITIES</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Explore Published Jobs
        </h1>
        <p className="mt-2 text-slate-500">
          Discover verified job openings filtered by skills, location, work mode,
          experience, and compensation.
        </p>
      </div>

      {/* Search & Multi-Filter Panel */}
      <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <JobSearch
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search job title, company, or keywords..."
          />
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={filters.skill}
            onChange={(e) => updateFilter("skill", e.target.value)}
            placeholder="Skills (e.g. React.js, Node.js)"
            className={`${filterInputClass} w-48`}
          />

          <input
            type="text"
            value={filters.location}
            onChange={(e) => updateFilter("location", e.target.value)}
            placeholder="City, State, or Country"
            className={`${filterInputClass} w-44`}
          />

          <input
            type="text"
            value={filters.industry}
            onChange={(e) => updateFilter("industry", e.target.value)}
            placeholder="Industry"
            className={`${filterInputClass} w-36`}
          />

          <select
            value={filters.employmentType}
            onChange={(e) => updateFilter("employmentType", e.target.value)}
            className={filterInputClass}
          >
            <option value="ALL">All Employment Types</option>
            {employmentTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filters.workMode}
            onChange={(e) => updateFilter("workMode", e.target.value)}
            className={filterInputClass}
          >
            <option value="ALL">All Work Modes</option>
            {workModeOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            max="50"
            value={filters.maxExperience}
            onChange={(e) => updateFilter("maxExperience", e.target.value)}
            placeholder="Max Exp (yrs)"
            className={`${filterInputClass} w-32`}
          />

          <input
            type="number"
            min="0"
            step="50000"
            value={filters.minSalary}
            onChange={(e) => updateFilter("minSalary", e.target.value)}
            placeholder="Min Salary"
            className={`${filterInputClass} w-32`}
          />

          <select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split(":");
              setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
              setPage(1);
            }}
            className={filterInputClass}
          >
            <option value="publishedAt:desc">Newest Published</option>
            <option value="minSalary:desc">Highest Salary</option>
            <option value="createdAt:desc">Recently Added</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {query.isPending ? (
        <LoadingState title="Loading published jobs" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load jobs"
          message={
            query.error?.response?.data?.message ||
            "Unable to load job opportunities right now."
          }
          onRetry={query.refetch}
        />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BriefcaseBusiness className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 font-semibold text-slate-900">
            No matching jobs found
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try broadening your search keywords or clearing active filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              mode="public"
              linkPrefix={linkPrefix}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page <span className="font-semibold">{pagination.page}</span> of{" "}
            <span className="font-semibold">{pagination.totalPages}</span> (
            {pagination.total} jobs)
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1 px-3 py-2 text-xs"
            >
              <ChevronLeft size={14} /> Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1 px-3 py-2 text-xs"
            >
              Next <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
