import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import { companyStatusOptions } from "../schema/companySchemas";
import { CompanyStatusBadge } from "../components/CompanyStatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../../utils/formatters";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

export function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState({ type: null, company: null });

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useQuery({
    queryKey: [
      "companies",
      "admin-list",
      { q: debouncedSearch, status: statusFilter, page },
    ],
    queryFn: () =>
      companiesApi.listCompanies({
        q: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page,
        limit: 10,
      }),
  });

  function onMutationSuccess(msg) {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    toast.success(msg);
    setDialog({ type: null, company: null });
  }

  const approveMutation = useMutation({
    mutationFn: (companyId) => companiesApi.approveCompany(companyId),
    onSuccess: () => onMutationSuccess("Company approved!"),
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Could not approve company."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ companyId, reason }) =>
      companiesApi.rejectCompany(companyId, reason),
    onSuccess: () => onMutationSuccess("Company rejected."),
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Could not reject company."),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ companyId, reason }) =>
      companiesApi.suspendCompany(companyId, reason),
    onSuccess: () => onMutationSuccess("Company suspended."),
    onError: (err) =>
      toast.error(err?.response?.data?.message || "Could not suspend company."),
  });

  const companies = query.data?.data?.companies ?? query.data?.companies ?? [];
  const pagination = query.data?.data?.pagination ?? {
    total: companies.length,
    page: 1,
    totalPages: 1,
  };

  return (
    <div>
      <div className="mb-7">
        <p className="text-sm font-medium text-brand">ADMINISTRATION</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Company Approvals & Directory
        </h1>
        <p className="mt-2 text-slate-500">
          Review company submissions, verify compliance details, and manage
          approval statuses.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 px-2">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name, email, GSTIN, CIN, or city..."
            className="w-full bg-transparent py-1.5 text-sm outline-none"
          />
        </div>

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
      </div>

      {query.isPending ? (
        <LoadingState title="Loading companies" />
      ) : query.isError ? (
        <ErrorState
          title="Could not load companies"
          message={
            query.error?.response?.data?.message || "Failed to load companies."
          }
          onRetry={query.refetch}
        />
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-3 font-semibold text-slate-900">
            No matching companies
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Try clearing your search or changing the status filter.
          </p>
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
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
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
                          <Link
                            to={`/app/companies/${c.id}`}
                            className="font-semibold text-slate-900 hover:text-brand"
                          >
                            {c.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {c.email || "No email"}
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
                          to={`/app/companies/${c.id}/approval`}
                          title="Review Company"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Eye size={15} />
                        </Link>
                        {c.status !== "APPROVED" && c.status !== "DRAFT" && (
                          <button
                            type="button"
                            title="Approve"
                            onClick={() =>
                              setDialog({ type: "approve", company: c })
                            }
                            className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        )}
                        {c.status === "PENDING_APPROVAL" && (
                          <button
                            type="button"
                            title="Reject"
                            onClick={() =>
                              setDialog({ type: "reject", company: c })
                            }
                            className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        {c.status === "APPROVED" && (
                          <button
                            type="button"
                            title="Suspend"
                            onClick={() =>
                              setDialog({ type: "suspend", company: c })
                            }
                            className="rounded-lg bg-rose-600 p-2 text-white hover:bg-rose-700"
                          >
                            <Ban size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
        open={dialog.type === "approve"}
        title="Approve company?"
        description={`Mark "${dialog.company?.name}" as APPROVED?`}
        confirmLabel="Approve"
        isPending={approveMutation.isPending}
        onClose={() => setDialog({ type: null, company: null })}
        onConfirm={() =>
          dialog.company && approveMutation.mutate(dialog.company.id)
        }
      />

      <ConfirmDialog
        open={dialog.type === "reject"}
        title="Reject company?"
        description={`Provide a rejection reason for "${dialog.company?.name}".`}
        confirmLabel="Reject Company"
        variant="danger"
        requireReason
        reasonLabel="Rejection reason *"
        isPending={rejectMutation.isPending}
        onClose={() => setDialog({ type: null, company: null })}
        onConfirm={(reason) =>
          dialog.company &&
          rejectMutation.mutate({ companyId: dialog.company.id, reason })
        }
      />

      <ConfirmDialog
        open={dialog.type === "suspend"}
        title="Suspend company?"
        description={`Provide a suspension reason for "${dialog.company?.name}".`}
        confirmLabel="Suspend Company"
        variant="danger"
        requireReason
        reasonLabel="Suspension reason *"
        isPending={suspendMutation.isPending}
        onClose={() => setDialog({ type: null, company: null })}
        onConfirm={(reason) =>
          dialog.company &&
          suspendMutation.mutate({ companyId: dialog.company.id, reason })
        }
      />
    </div>
  );
}
