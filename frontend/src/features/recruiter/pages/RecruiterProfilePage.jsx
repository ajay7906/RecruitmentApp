import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  UserRound,
  Briefcase,
  Link2,
  Save,
  Phone,
  Building2,
  Plus,
  Pencil,
  CheckCircle2,
  Globe,
  MapPin,
  Users2,
  Layers,
  XCircle,
} from "lucide-react";

import { recruiterApi } from "../api/recruiterApi";
import { recruiterProfileSchema } from "../schema/recruiterSchema";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { ProfileSection } from "../../candidate-profile/components/ProfileSection";
import { ProfileField, profileInputClass } from "../../candidate-profile/components/ProfileField";
import { CompanyModal } from "../components/CompanyModal";
import { useAuthStore } from "../../../stores/authStore";

// ── helpers ──────────────────────────────────────────────────────
function toFormDefaults(profile = {}, currentUser = null) {
  return {
    fullName: profile.user?.fullName ?? currentUser?.fullName ?? "",
    phone: profile.phone ?? "",
    designation: profile.designation ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
  };
}

function cleanPayload(values) {
  return {
    fullName: values.fullName || undefined,
    phone: values.phone || null,
    designation: values.designation || null,
    linkedinUrl: values.linkedinUrl || null,
    // companyId is managed separately via the company section
  };
}

// ── Page ─────────────────────────────────────────────────────────
export function RecruiterProfilePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // ── Profile query ──
  const query = useQuery({
    queryKey: ["recruiter", "profile"],
    queryFn: recruiterApi.getMyProfile,
    retry: false,
  });

  // ── Companies search query ──
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => recruiterApi.searchCompanies(""),
    staleTime: 60_000,
  });

  // ── Profile form ──
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(recruiterProfileSchema),
    defaultValues: toFormDefaults({}, user),
  });

  const profile =
    query.data?.data?.profile ?? query.data?.profile ?? query.data ?? {};

  useEffect(() => {
    reset(toFormDefaults(profile, user));
  }, [query.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values) => recruiterApi.updateMyProfile(cleanPayload(values)),
    onSuccess: (data) => {
      queryClient.setQueryData(["recruiter", "profile"], data);
      const updatedUser = data?.data?.profile?.user || data?.profile?.user;
      if (updatedUser && user) {
        setUser({ ...user, fullName: updatedUser.fullName });
      }
      toast.success("Profile saved!");
    },
    onError: (err) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to save. Please try again."
      ),
  });

  // ── Unlink company ──
  const unlinkMutation = useMutation({
    mutationFn: () => recruiterApi.updateMyProfile({ companyId: null }),
    onSuccess: (data) => {
      queryClient.setQueryData(["recruiter", "profile"], data);
      toast.success("Company unlinked.");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message ?? "Could not unlink company."),
  });

  // ── Link existing company ──
  const linkMutation = useMutation({
    mutationFn: (companyId) =>
      recruiterApi.updateMyProfile({ companyId }),
    onSuccess: (data) => {
      queryClient.setQueryData(["recruiter", "profile"], data);
      toast.success("Company linked!");
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message ?? "Could not link company."),
  });

  // ── Company modal state ──
  const [companyModal, setCompanyModal] = useState({
    open: false,
    company: null, // null = create mode
  });

  const linkedCompany = profile?.company ?? null;
  const companies = companiesQuery.data?.data?.companies ?? companiesQuery.data?.companies ?? [];

  // ── Loading / error ──
  if (query.isPending) return <LoadingState title="Loading recruiter profile" />;
  if (query.isError)
    return (
      <ErrorState
        title="Could not load profile"
        message={
          query.error?.response?.data?.message ??
          "Check your API connection and VITE_API_BASE_URL."
        }
        onRetry={query.refetch}
      />
    );

  const isSaving = saveMutation.isPending;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand">RECRUITER WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">My Profile</h1>
          <p className="mt-2 text-slate-500">
            Complete your profile so candidates can learn about you and your company.
          </p>
        </div>
        <Button
          type="submit"
          form="recruiter-profile-form"
          disabled={isSaving || !isDirty}
          className="hidden gap-2 sm:inline-flex"
        >
          <Save size={16} />
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* ── Personal & Professional form ── */}
        <form
          id="recruiter-profile-form"
          onSubmit={handleSubmit((v) => saveMutation.mutate(v))}
          noValidate
          className="space-y-6"
        >
          {/* Personal */}
          <ProfileSection
            title="Personal information"
            description="Your name and contact details."
            icon={UserRound}
          >
            <ProfileField label="Full name *" error={errors.fullName?.message}>
              <input
                id="fullName"
                type="text"
                placeholder="Jane Smith"
                autoComplete="name"
                className={profileInputClass}
                {...register("fullName")}
              />
            </ProfileField>

            <ProfileField label="Phone number" error={errors.phone?.message}>
              <div className="relative">
                <Phone
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recruiter-phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                  className={`${profileInputClass} pl-9`}
                  {...register("phone")}
                />
              </div>
            </ProfileField>
          </ProfileSection>

          {/* Professional */}
          <ProfileSection
            title="Professional details"
            description="Your role and online presence."
            icon={Briefcase}
          >
            <ProfileField label="Job designation" error={errors.designation?.message}>
              <div className="relative">
                <Briefcase
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="designation"
                  type="text"
                  placeholder="e.g. Senior Talent Acquisition"
                  className={`${profileInputClass} pl-9`}
                  {...register("designation")}
                />
              </div>
            </ProfileField>

            <ProfileField label="LinkedIn URL" error={errors.linkedinUrl?.message}>
              <div className="relative">
                <Link2
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="recruiter-linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/yourname"
                  className={`${profileInputClass} pl-9`}
                  {...register("linkedinUrl")}
                />
              </div>
            </ProfileField>
          </ProfileSection>

          {/* Mobile save */}
          <div className="flex justify-end sm:hidden">
            <Button
              type="submit"
              disabled={isSaving || !isDirty}
              className="w-full gap-2"
            >
              <Save size={16} />
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>

        {/* ── Company section ── */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Company</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {linkedCompany
                    ? "Your account is linked to this company."
                    : "Link your account to a company or create a new one."}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              {linkedCompany ? (
                <>
                  <Button
                    variant="secondary"
                    className="gap-1.5 text-xs"
                    onClick={() =>
                      setCompanyModal({ open: true, company: linkedCompany })
                    }
                  >
                    <Pencil size={13} /> Edit company
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-1.5 text-xs text-red-500 hover:bg-red-50"
                    onClick={() => unlinkMutation.mutate()}
                    disabled={unlinkMutation.isPending}
                  >
                    <XCircle size={13} /> Unlink
                  </Button>
                </>
              ) : (
                <Button
                  className="gap-1.5 text-sm"
                  onClick={() => setCompanyModal({ open: true, company: null })}
                >
                  <Plus size={15} /> Add company
                </Button>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {linkedCompany ? (
              /* ── Linked company card ── */
              <CompanyCard company={linkedCompany} />
            ) : (
              /* ── No company — search / link ── */
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  Search for an existing company to link to your profile, or create
                  a new one above.
                </p>

                {companiesQuery.isPending ? (
                  <p className="text-sm text-slate-400">Loading companies…</p>
                ) : companies.length === 0 ? (
                  <p className="text-sm text-slate-400">No companies found.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => linkMutation.mutate(c.id)}
                        disabled={linkMutation.isPending}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-60"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {c.name}
                          </p>
                          {c.industry && (
                            <p className="truncate text-xs text-slate-500">
                              {c.industry}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Company modal ── */}
      <CompanyModal
        open={companyModal.open}
        company={companyModal.company}
        onClose={() => setCompanyModal({ open: false, company: null })}
      />
    </div>
  );
}

// ── Company detail card ───────────────────────────────────────────
function CompanyCard({ company }) {
  const meta = [
    { icon: Layers, value: company.industry, label: "Industry" },
    { icon: Users2, value: company.companySize ? `${company.companySize} employees` : null, label: "Size" },
    { icon: MapPin, value: company.location, label: "Location" },
    { icon: Globe, value: company.website, label: "Website", isLink: true },
  ].filter((m) => m.value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-white">
          <Building2 size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{company.name}</h3>
            <CheckCircle2 size={15} className="text-green-500" />
          </div>
          <p className="text-xs text-slate-500">Linked company</p>
        </div>
      </div>

      {meta.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {meta.map(({ icon: Icon, value, label, isLink }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-slate-600">
              <Icon size={14} className="shrink-0 text-slate-400" />
              {isLink ? (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-brand hover:underline"
                >
                  {value}
                </a>
              ) : (
                <span className="truncate">{value}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {company.description && (
        <p className="text-sm leading-relaxed text-slate-600">
          {company.description}
        </p>
      )}
    </div>
  );
}
