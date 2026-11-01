import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  UserRound,
  MapPin,
  Briefcase,
  Link2,
  Save,
  Phone,
  Calendar,
  Users,
  FileText,
  Building2,
} from "lucide-react";

import { profileApi } from "../api/profileApi";
import { profileSchema } from "../schema/profileSchema";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { ProfileSection } from "../components/ProfileSection";
import { ProfileField, profileInputClass } from "../components/ProfileField";

// Helper to coerce API data into form-safe strings
function toFormDefaults(profile = {}) {
  return {
    phone: profile.phone ?? "",
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
      : "",
    gender: profile.gender ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    country: profile.country ?? "",
    yearsOfExperience:
      profile.yearsOfExperience != null
        ? String(profile.yearsOfExperience)
        : "",
    currentJobTitle: profile.currentJobTitle ?? "",
    currentCompany: profile.currentCompany ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
  };
}

export function ProfilePage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: profileApi.getMyProfile,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["candidate", "profile"], data);
      toast.success("Profile saved successfully!");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to save profile. Please try again."
      );
    },
  });

  const profile =
    query.data?.data?.profile ?? query.data?.profile ?? query.data ?? {};

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormDefaults(profile),
  });

  // Re-populate form when data arrives / changes
  useEffect(() => {
    reset(toFormDefaults(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  function onSubmit(values) {
    // Convert numeric/empty strings for the backend
    const payload = {
      ...values,
      phone: values.phone || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      headline: values.headline || null,
      bio: values.bio || null,
      location: values.location || null,
      city: values.city || null,
      state: values.state || null,
      country: values.country || null,
      yearsOfExperience:
        values.yearsOfExperience !== ""
          ? Number(values.yearsOfExperience)
          : null,
      currentJobTitle: values.currentJobTitle || null,
      currentCompany: values.currentCompany || null,
      linkedinUrl: values.linkedinUrl || null,
      githubUrl: values.githubUrl || null,
      portfolioUrl: values.portfolioUrl || null,
    };
    mutation.mutate(payload);
  }

  if (query.isPending) return <LoadingState title="Loading profile" />;
  if (query.isError)
    return (
      <ErrorState
        title="Could not load profile"
        message={
          query.error?.response?.data?.message ||
          "Check the profile endpoint in src/features/candidate-profile/api/profileApi.js and your VITE_API_BASE_URL."
        }
        onRetry={query.refetch}
      />
    );

  const isSaving = mutation.isPending;

  return (
    <div>
      {/* Page header */}
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-brand">YOUR INFORMATION</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">My Profile</h1>
          <p className="mt-2 text-slate-500">
            Keep your profile up to date to get better job matches.
          </p>
        </div>
        <Button
          type="submit"
          form="profile-form"
          disabled={isSaving || !isDirty}
          className="gap-2 hidden sm:inline-flex"
        >
          <Save size={16} />
          {isSaving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <form id="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-6">
          {/* ── Personal Info ── */}
          <ProfileSection
            title="Personal information"
            description="Basic details about you."
            icon={UserRound}
          >
            <ProfileField label="Phone number" error={errors.phone?.message}>
              <div className="relative">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 555 000 0000"
                  autoComplete="tel"
                  className={`${profileInputClass} pl-9`}
                  {...register("phone")}
                />
              </div>
            </ProfileField>

            <ProfileField label="Date of birth" error={errors.dateOfBirth?.message}>
              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="dateOfBirth"
                  type="date"
                  className={`${profileInputClass} pl-9`}
                  {...register("dateOfBirth")}
                />
              </div>
            </ProfileField>

            <ProfileField label="Gender" error={errors.gender?.message}>
              <div className="relative">
                <Users
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  id="gender"
                  className={`${profileInputClass} pl-9 appearance-none`}
                  {...register("gender")}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </ProfileField>
          </ProfileSection>

          {/* ── Professional Info ── */}
          <ProfileSection
            title="Professional details"
            description="Your headline, experience, and current role."
            icon={Briefcase}
          >
            <ProfileField
              label="Professional headline"
              error={errors.headline?.message}
              className="sm:col-span-2"
            >
              <input
                id="headline"
                type="text"
                placeholder="e.g. Senior Frontend Engineer"
                className={profileInputClass}
                {...register("headline")}
              />
            </ProfileField>

            <ProfileField label="Years of experience" error={errors.yearsOfExperience?.message}>
              <input
                id="yearsOfExperience"
                type="number"
                min="0"
                max="60"
                step="0.5"
                placeholder="e.g. 5"
                className={profileInputClass}
                {...register("yearsOfExperience")}
              />
            </ProfileField>

            <ProfileField label="Current job title" error={errors.currentJobTitle?.message}>
              <input
                id="currentJobTitle"
                type="text"
                placeholder="e.g. Software Engineer"
                className={profileInputClass}
                {...register("currentJobTitle")}
              />
            </ProfileField>

            <ProfileField label="Current company" error={errors.currentCompany?.message}>
              <div className="relative">
                <Building2
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="currentCompany"
                  type="text"
                  placeholder="e.g. Acme Corp"
                  className={`${profileInputClass} pl-9`}
                  {...register("currentCompany")}
                />
              </div>
            </ProfileField>

            <ProfileField
              label="Bio"
              error={errors.bio?.message}
              className="sm:col-span-2"
            >
              <textarea
                id="bio"
                rows={4}
                placeholder="Write a short bio about yourself…"
                className={`${profileInputClass} resize-none`}
                {...register("bio")}
              />
            </ProfileField>
          </ProfileSection>

          {/* ── Location ── */}
          <ProfileSection
            title="Location"
            description="Where you are based."
            icon={MapPin}
          >
            <ProfileField
              label="Location (general)"
              error={errors.location?.message}
              className="sm:col-span-2"
            >
              <input
                id="location"
                type="text"
                placeholder="e.g. San Francisco Bay Area"
                className={profileInputClass}
                {...register("location")}
              />
            </ProfileField>

            <ProfileField label="City" error={errors.city?.message}>
              <input
                id="city"
                type="text"
                placeholder="e.g. San Francisco"
                className={profileInputClass}
                {...register("city")}
              />
            </ProfileField>

            <ProfileField label="State / Province" error={errors.state?.message}>
              <input
                id="state"
                type="text"
                placeholder="e.g. California"
                className={profileInputClass}
                {...register("state")}
              />
            </ProfileField>

            <ProfileField label="Country" error={errors.country?.message}>
              <input
                id="country"
                type="text"
                placeholder="e.g. United States"
                className={profileInputClass}
                {...register("country")}
              />
            </ProfileField>
          </ProfileSection>

          {/* ── Online Presence ── */}
          <ProfileSection
            title="Online presence"
            description="Links to your professional profiles and portfolio."
            icon={Link2}
          >
            <ProfileField label="LinkedIn URL" error={errors.linkedinUrl?.message}>
              <div className="relative">
                <Link2
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/yourname"
                  className={`${profileInputClass} pl-9`}
                  {...register("linkedinUrl")}
                />
              </div>
            </ProfileField>

            <ProfileField label="GitHub URL" error={errors.githubUrl?.message}>
              <div className="relative">
                <Link2
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/yourname"
                  className={`${profileInputClass} pl-9`}
                  {...register("githubUrl")}
                />
              </div>
            </ProfileField>

            <ProfileField label="Portfolio URL" error={errors.portfolioUrl?.message}>
              <div className="relative">
                <FileText
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="portfolioUrl"
                  type="url"
                  placeholder="https://yourportfolio.com"
                  className={`${profileInputClass} pl-9`}
                  {...register("portfolioUrl")}
                />
              </div>
            </ProfileField>
          </ProfileSection>

          {/* Mobile save button */}
          <div className="flex justify-end sm:hidden">
            <Button
              type="submit"
              form="profile-form"
              disabled={isSaving || !isDirty}
              className="w-full gap-2"
            >
              <Save size={16} />
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
