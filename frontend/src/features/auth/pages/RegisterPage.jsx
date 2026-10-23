import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema } from "../schemas/authSchemas";
import { authApi } from "../api/authApi";
import { useAuthStore } from "../../../stores/authStore";
import { FormField } from "../../../components/ui/FormField";
import { Button } from "../../../components/ui/Button";

export function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "candidate" },
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const response = await authApi.register(values);
      const user = response.user || response.data?.user;
      if (user) {
        setSession(user);
        navigate("/app/dashboard", { replace: true });
      } else {
        toast.success("Registration complete. Please sign in.");
        navigate("/login");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to register");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-soft sm:p-9">
        <p className="text-sm font-semibold text-brand">GET STARTED</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">Choose the workspace that matches your role.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <FormField label="Full name" placeholder="Your name" autoComplete="name" error={errors.name?.message} {...register("name")} />
          <FormField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <FormField label="Password" type="password" placeholder="At least 8 characters" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
          <label className="block text-sm font-medium text-slate-700">I am joining as
            <select {...register("role")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-blue-100">
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </label>
          {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Creating account..." : "Create account"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">Already registered? <Link className="font-semibold text-brand hover:underline" to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
