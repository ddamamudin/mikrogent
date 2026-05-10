import { Suspense } from "react";
import VerifyEmailContent from "./VerifyEmailContent";

export default function VerifikasiEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Memverifikasi email...</p>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
