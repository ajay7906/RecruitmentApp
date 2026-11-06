import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { authApi } from "../api/authApi";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Verifying your email address..." : "Missing verification token."
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (!active) return;
        setStatus("success");
        setMessage(res?.message || "Your email has been verified. You can now sign in.");
      })
      .catch((err) => {
        if (!active) return;
        setStatus("error");
        setMessage(
          err?.response?.data?.message || "Invalid or expired verification link."
        );
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-soft sm:p-9">
        {status === "loading" && (
          <Loader2 className="mx-auto animate-spin text-brand" size={36} />
        )}
        {status === "success" && (
          <CheckCircle2 className="mx-auto text-green-600" size={36} />
        )}
        {status === "error" && (
          <XCircle className="mx-auto text-red-500" size={36} />
        )}
        <h1 className="mt-4 text-2xl font-bold text-slate-950">
          {status === "loading"
            ? "Verifying Email"
            : status === "success"
            ? "Email Verified"
            : "Verification Failed"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
