import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <p className="text-white/60">Memverifikasi email...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
