import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  LayoutGrid,
  List,
  Eye,
  Pencil,
  Send,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import { companyStatusOptions } from "../schema/companySchemas";
import { CompanyCard } from "../components/CompanyCard";
import { CompanyStatusBadge, CompanyRoleBadge } from "../components/CompanyStatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../../utils/formatters";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

export function MyCompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");
  const [confirmSubmitCompany, setConfirmSubmitCompany] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: [
      "companies",
      "my",
      { q: debouncedSearch, status: statusFilter, page },
    ],
    queryFn: () =>
      companiesApi.getMyCompanies({
        q: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page,
        limit: 10,
      }),
  });

  const submitMutation = useMutation({
    mutationFn: (companyId) => companiesApi.submitForApproval(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company submitted for approval!");
      setConfirmSubmitCompany(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Could not submit company for approval."
      );
      setConfirmSubmitCompany(null);
    },
  });

  const companies =
    query.data?.data?.companies ?? query.data?.companies ?? [];
  const pagination = query.data?.data?.pagination ?? {
    total: companies.length,
    page: 1,
    totalPages: 1,
  };

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">COMPANY MANAGEMENT</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            My Companies
          </h1>
          <p className="mt-2 text-slate-500">
            Manage companies you own or belong to, track approval status, and
            collaborate with your recruiting team.
          </p>
        </div>

        <Link
          to="/app/companies/new"
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-blue-700"
        >
          <Plus size={17} />
          Register Company
        </Link>
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 px-2">
          <Search size={18} className=" shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name, industry, or city..."
            className="w-full bg-transparent py-1.5 text-sm outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand"
          >
            <option value="ALL">All statuses</option>
            {companyStatusOptions.map((st) => (
              <option key={st} value={st}>
                {st.replace("_", " ")}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              className={`rounded-lg p-1.5 transition ${
                viewMode === "grid"
                  ? "bg-white text-brand shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {query.isPending ? (
        <LoadingState title="Loading your companies" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load companies"
          message={
            query.error?.response?.data?.message ||
            "Failed to fetch your associated companies."
          }
          onRetry={query.refetch}
        />
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto text-slate-400" size={34} />
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            No companies found
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {search || statusFilter !== "ALL"
              ? "No companies match your current search or filter criteria."
              : "You are not associated with any company yet. Register your company or ask a company owner to add you."}
          </p>
          <div className="mt-5">
            <Link
              to="/app/companies/new"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Register your company
            </Link>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSubmitting={submitMutation.isPending}
              onSubmitForApproval={(c) => setConfirmSubmitCompany(c)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Company</th>
                  <th className="px-4 py-3.5">Industry & Size</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5">Recruiters</th>
                  <th className="px-4 py-3.5">Registered</th>
                  <th className="px-4 py-3.5">Approval Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => {
                  const canEdit = c.canManage;
                  const canSubmit =
                    canEdit &&
                    (c.status === "DRAFT" || c.status === "REJECTED");

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-brand">
                            {c.logoUrl ? (
                              <img
                                src={c.logoUrl}
                                alt={c.name}
                                className="h-full w-full object-contain p-1"
                              />
                            ) : (
                              <Building2 size={18} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/app/companies/${c.id}/dashboard`}
                                className="font-semibold text-slate-900 hover:text-brand"
                              >
                                {c.name}
                              </Link>
                              <CompanyRoleBadge role={c.myRole} />
                            </div>
                            <p className="text-xs text-slate-500">
                              {[c.city, c.state, c.country]
                                .filter(Boolean)
                                .join(", ") ||
                                c.location ||
                                "Location not specified"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-800">
                          {c.industry || "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {c.companySize ? `${c.companySize} employees` : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {c.owner?.fullName || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {c.recruiterCount ?? 1}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-4">
                        <CompanyStatusBadge status={c.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <Link
                            to={`/app/companies/${c.id}/dashboard`}
                            title="Company Dashboard"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-brand"
                          >
                            <LayoutDashboard size={15} />
                          </Link>
                          <Link
                            to={`/app/companies/${c.id}`}
                            title="View Details"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye size={15} />
                          </Link>
                          {canEdit && (
                            <Link
                              to={`/app/companies/${c.id}/edit`}
                              title="Edit Company"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Pencil size={15} />
                            </Link>
                          )}
                          {canSubmit && (
                            <button
                              type="button"
                              title="Submit for Approval"
                              onClick={() => setConfirmSubmitCompany(c)}
                              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              <Send size={13} />
                              Submit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page <span className="font-semibold">{pagination.page}</span> of{" "}
            <span className="font-semibold">{pagination.totalPages}</span> (
            {pagination.total} companies)
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

      <ConfirmDialog
        open={Boolean(confirmSubmitCompany)}
        title="Submit company for approval?"
        description={`"${confirmSubmitCompany?.name}" will be sent to the administrator team for verification and approval.`}
        confirmLabel="Submit for Approval"
        isPending={submitMutation.isPending}
        onClose={() => setConfirmSubmitCompany(null)}
        onConfirm={() =>
          confirmSubmitCompany &&
          submitMutation.mutate(confirmSubmitCompany.id)
        }
      />
    </div>
  );
}
