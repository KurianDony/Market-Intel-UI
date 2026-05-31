"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTabSessionAlive, markTabSessionAlive } from "@/lib/auth/tab-session";

const BOOTSTRAP_PREFIX = "/auth/tab-session";

export function TabSessionGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (pathname?.startsWith(BOOTSTRAP_PREFIX)) {
        if (!cancelled) setReady(true);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      const alive = isTabSessionAlive();

      if (session && !alive) {
        await supabase.auth.signOut();
        if (!pathname?.startsWith("/auth/")) {
          router.replace("/auth/login");
        }
        if (!cancelled) setReady(true);
        return;
      }

      if (session && alive) {
        markTabSessionAlive();
      }

      if (!cancelled) setReady(true);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
