import { useQuery } from "@tanstack/react-query";
import { UserRound, AlertCircle } from "lucide-react";
import { profileApi } from "../api/profileApi";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";

export function ProfilePage() {
  const query = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: profileApi.getMyProfile,
    retry: false,
  });

  if (query.isPending) return <LoadingState title="Loading profile" />;
  if (query.isError) return <ErrorState title="Profile API needs connecting" message={query.error?.response?.data?.message || "Check the profile endpoint in src/features/candidate-profile/api/profileApi.js and your VITE_API_BASE_URL."} onRetry={query.refetch} />;

  const profile = query.data?.profile || query.data?.data?.profile || query.data;
  return (
    <div>
      <div className="mb-7"><p className="text-sm font-medium text-brand">YOUR INFORMATION</p><h1 className="mt-2 text-3xl font-bold text-slate-950">My profile</h1><p className="mt-2 text-slate-500">Profile data returned by your backend.</p></div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand"><UserRound /></span><div><h2 className="font-semibold text-slate-900">Profile response</h2><p className="text-sm text-slate-500">Confirm field names before adding the edit form.</p></div></div>
        <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{JSON.stringify(profile, null, 2)}</pre>
      </section>
    </div>
  );
}
