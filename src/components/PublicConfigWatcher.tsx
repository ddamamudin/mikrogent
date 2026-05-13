"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribe ke topic public:config (gak butuh login). Saat admin toggle
 * registrationEnabled / adminSetupEnabled, server fire event "config.changed"
 * → router.refresh() trigger RSC re-render dengan config baru, halaman
 * auto-update tanpa F5.
 *
 * Mount di Server Component yang renderingnya bergantung config publik
 * (mis. /daftar, /admin/setup).
 */
export default function PublicConfigWatcher() {
  const router = useRouter();
  useEffect(() => {
    const es = new EventSource("/api/realtime?topic=public:config");
    es.addEventListener("config.changed", () => { router.refresh(); });
    return () => { es.close(); };
  }, [router]);
  return null;
}
