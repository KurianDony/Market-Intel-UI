"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { markTabSessionAlive } from "@/lib/auth/tab-session";

function TabSessionBootstrapInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    markTabSessionAlive();
    router.replace(next);
  }, [next, router]);

  return null;
}

export default function TabSessionPage() {
  return (
    <Suspense fallback={null}>
      <TabSessionBootstrapInner />
    </Suspense>
  );
}
