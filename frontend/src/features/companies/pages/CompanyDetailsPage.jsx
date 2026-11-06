import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Layers,
  Users2,
  Calendar,
  FileText,
  Link2,
  ShieldCheck,
  Pencil,
  LayoutDashboard,
  UserPlus,
  Trash2,
  Crown,
  Send,
} from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import {
  CompanyStatusBadge,
  CompanyRoleBadge,
} from "../components/CompanyStatusBadge";
import { CompanyLogoUpload } from "../components/CompanyLogoUpload";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";
import { formatDate } from "../../../utils/formatters";

export function CompanyDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("RECRUITER");
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberToMakeOwner, setMemberToMakeOwner] = useState(null);

  const query = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: () => companiesApi.getCompanyById(id),
    retry: false,
  });

  const company = query.data?.data?.company ?? query.data?.company;

  function syncCompanyCache(updatedCompany) {
    if (updatedCompany) {
      queryClient.setQueryData(["companies", "detail", id], {
        success: true,
        data: { company: updatedCompany },
      });
    }
    queryClient.invalidateQueries({ queryKey: ["companies"] });
  }

  const logoMutation = useMutation({
    mutationFn: (logoUrl) => companiesApi.updateCompanyLogo(id, logoUrl || null),
    onSuccess: (res) => {
      syncCompanyCache(res?.data?.company ?? res?.company);
      toast.success("Company logo updated!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not update logo.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => companiesApi.submitForApproval(id),
    onSuccess: (res) => {
      syncCompanyCache(res?.data?.company ?? res?.company);
      toast.success("Company submitted for approval!");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to submit company for approval."
      );
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload) => companiesApi.addMember(id, payload),
    onSuccess: (res) => {
      syncCompanyCache(res?.data?.company ?? res?.company);
      setMemberEmail("");
      setMemberRole("RECRUITER");
      toast.success("Recruiter added to company!");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Could not add member to company."
      );
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ membershipId, role }) =>
      companiesApi.updateMemberRole(id, membershipId, role),
    onSuccess: (res) => {
      syncCompanyCache(res?.data?.company ?? res?.company);
      setMemberToMakeOwner(null);
      toast.success("Member role updated!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update role.");
      setMemberToMakeOwner(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId) => companiesApi.removeMember(id, membershipId),
    onSuccess: (res) => {
      syncCompanyCache(res?.data?.company ?? res?.company);
      setMemberToRemove(null);
      toast.success("Member removed from company.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Could not remove member.");
      setMemberToRemove(null);
    },
  });

  if (query.isPending) return <LoadingState title="Loading company profile" />;
  if (query.isError || !company) {
    return (
      <ErrorState
        title="Could not load company details"
        message={
          query.error?.response?.data?.message ||
          "The requested company could not be found."
        }
        onRetry={query.refetch}
      />
    );
  }

  const canEdit = company.canManage;
  const isOwner = company.canManageOwnership;
  const canSubmit =
    canEdit &&
    (company.status === "DRAFT" || company.status === "REJECTED");

  function handleAddMember(e) {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    addMemberMutation.mutate({
      email: memberEmail.trim(),
      role: memberRole,
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/app/companies"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to My Companies
          </Link>
          <p className="mt-3 text-sm font-medium text-brand">COMPANY PROFILE</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{company.name}</h1>
            <CompanyStatusBadge status={company.status} />
            <CompanyRoleBadge role={company.myRole} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Registered on {formatDate(company.createdAt)} ·{" "}
            {company.companyType || "Organization"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/app/companies/${company.id}/dashboard`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link
            to={`/app/companies/${company.id}/approval`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ShieldCheck size={16} />
            Approval Status
          </Link>
          {canEdit && (
            <Link
              to={`/app/companies/${company.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Pencil size={16} />
              Edit Company
            </Link>
          )}
          {canSubmit && (
            <Button
              type="button"
              variant="secondary"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="gap-2 border-brand/30 py-2.5 text-brand hover:bg-blue-50"
            >
              <Send size={15} />
              {submitMutation.isPending
                ? "Submitting..."
                : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Brand & Logo Section ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Company Logo & Brand</h2>
            <p className="mt-1 text-sm text-slate-500">
              {canEdit
                ? "Upload or update the official company logo displayed across job listings."
                : "Official company brand identity."}
            </p>
          </div>
          {canEdit ? (
            <CompanyLogoUpload
              value={company.logoUrl}
              disabled={logoMutation.isPending}
              onChange={(newLogo) => logoMutation.mutate(newLogo)}
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 size={30} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Overview & Details Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 columns: Description, Location, Legal */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <FileText size={18} className="text-brand" />
              <h2 className="font-semibold text-slate-900">
                About {company.name}
              </h2>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
              {company.description || "No company description provided yet."}
            </p>

            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-400">Industry</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Layers size={15} className="text-slate-400" />
                  {company.industry || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Company Size
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Users2 size={15} className="text-slate-400" />
                  {company.companySize
                    ? `${company.companySize} employees`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Founded Year
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Calendar size={15} className="text-slate-400" />
                  {company.foundedYear || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Headquarters & Compliance */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <MapPin size={18} className="text-brand" />
              <h2 className="font-semibold text-slate-900">
                Location & Registration Identifiers
              </h2>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  City / State / Country
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {[company.city, company.state, company.country]
                    .filter(Boolean)
                    .join(", ") ||
                    company.location ||
                    "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Company Type
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {company.companyType || "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-slate-400">
                  Complete Office Address
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {company.address || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">GSTIN</p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-800">
                  {company.gstin || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">
                  CIN / Registration Number
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-800">
                  {company.registrationNumber || "Not provided"}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right column: Contact & Approval Status Summary */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Contact Information</h2>
            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center gap-3 text-slate-700">
                <Mail size={16} className="shrink-0 text-slate-400" />
                <span className="truncate">{company.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Phone size={16} className="shrink-0 text-slate-400" />
                <span>{company.contactNumber || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Globe size={16} className="shrink-0 text-slate-400" />
                {company.website ? (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-brand hover:underline"
                  >
                    {company.website}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-slate-700">
                <Link2 size={16} className="shrink-0 text-slate-400" />
                {company.linkedinUrl ? (
                  <a
                    href={company.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-brand hover:underline"
                  >
                    LinkedIn Page
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Registration & Approval
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Status</span>
                <CompanyStatusBadge status={company.status} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registered On</span>
                <span className="font-medium text-slate-800">
                  {formatDate(company.createdAt)}
                </span>
              </div>
              {company.submittedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Submitted On</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(company.submittedAt)}
                  </span>
                </div>
              )}
              {company.approvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Approved On</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(company.approvedAt)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <Link
                to={`/app/companies/${company.id}/approval`}
                className="text-xs font-semibold text-brand hover:underline"
              >
                View full approval history & status →
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* ── Ownership & Team Memberships ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Company Ownership & Recruiter Team
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Multiple recruiters can belong to this company with Owner, Admin, or
              Recruiter roles.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Crown size={15} className="text-purple-600" />
            Owner:{" "}
            <strong className="text-slate-800">
              {company.owner?.fullName || "Assigned"}
            </strong>
          </div>
        </div>

        {/* Add Member Form (Owner / Admin only) */}
        {canEdit && (
          <form
            onSubmit={handleAddMember}
            className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Add recruiter by email
              </label>
              <input
                type="email"
                required
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className={profileInputClass}
              />
            </div>

            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Company role
              </label>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className={`${profileInputClass} appearance-none`}
              >
                <option value="RECRUITER">Recruiter</option>
                {isOwner && <option value="ADMIN">Company Admin</option>}
              </select>
            </div>

            <Button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="gap-2"
            >
              <UserPlus size={16} />
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </form>
        )}

        {/* Members List */}
        <div className="mt-5 divide-y divide-slate-100">
          {(company.memberships || []).map((m) => {
            const memberIsOwner =
              m.role === "OWNER" || m.userId === company.ownerId;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-sm font-bold text-brand">
                    {(m.user?.fullName || "R").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {m.user?.fullName || "Recruiter"}
                      </p>
                      <CompanyRoleBadge
                        role={memberIsOwner ? "OWNER" : m.role}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {m.user?.email}
                      {m.user?.recruiterProfile?.designation
                        ? ` · ${m.user.recruiterProfile.designation}`
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Role & Ownership Controls */}
                {!memberIsOwner && canEdit && (
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <>
                        <select
                          value={m.role}
                          disabled={updateRoleMutation.isPending}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              membershipId: m.id,
                              role: e.target.value,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                        >
                          <option value="RECRUITER">Recruiter</option>
                          <option value="ADMIN">Admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setMemberToMakeOwner(m)}
                          className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                        >
                          Transfer Ownership
                        </button>
                      </>
                    )}

                    {(isOwner || m.role === "RECRUITER") && (
                      <button
                        type="button"
                        onClick={() => setMemberToRemove(m)}
                        aria-label="Remove member"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Confirm Remove Member */}
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        title="Remove member from company?"
        description={`Remove ${memberToRemove?.user?.fullName || "this recruiter"} from ${company.name}?`}
        confirmLabel="Remove Member"
        variant="danger"
        isPending={removeMemberMutation.isPending}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() =>
          memberToRemove && removeMemberMutation.mutate(memberToRemove.id)
        }
      />

      {/* Confirm Ownership Transfer */}
      <ConfirmDialog
        open={Boolean(memberToMakeOwner)}
        title="Transfer company ownership?"
        description={`Make ${memberToMakeOwner?.user?.fullName} the new Owner of ${company.name}? Your role will become Company Admin.`}
        confirmLabel="Transfer Ownership"
        isPending={updateRoleMutation.isPending}
        onClose={() => setMemberToMakeOwner(null)}
        onConfirm={() =>
          memberToMakeOwner &&
          updateRoleMutation.mutate({
            membershipId: memberToMakeOwner.id,
            role: "OWNER",
          })
        }
      />
    </div>
  );
}
