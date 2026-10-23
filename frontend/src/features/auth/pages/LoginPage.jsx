import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema } from "../schemas/authSchemas";
import { authApi } from "../api/authApi";
import { useAuthStore } from "../../../stores/authStore";
import { FormField } from "../../../components/ui/FormField";
import { Button } from "../../../components/ui/Button";

export function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const response = await authApi.login(values);
      // Adapt this parsing to the actual response from your backend.
      const user = response.user || response.data?.user;
      console.log("Login response:", response); // Debugging line
      if (!user) throw new Error("Login response did not contain a user. Check authApi.js response parsing.");
      // setSession(user);
      if(!response.data?.accessToken) {
        throw new Error("Login response did not contain an access token. Check authApi.js response parsing.");
      }
      useAuthStore.getState().setAuth(user, response.data.accessToken);
      toast.success("Signed in successfully");
      navigate(location.state?.from?.pathname || "/app/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-soft sm:p-9">
        <p className="text-sm font-semibold text-brand">WELCOME BACK</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to Recruitro</h1>
        <p className="mt-2 text-sm text-slate-500">Continue to your recruitment workspace.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <FormField label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={errors.email?.message} {...register("email")} />
          <FormField label="Password" type="password" placeholder="Enter your password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">New to Recruitro? <Link className="font-semibold text-brand hover:underline" to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}
