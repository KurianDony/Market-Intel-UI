"use client";

import { createClient } from "@/lib/supabase/client";
import { clearTabSessionMarker } from "@/lib/auth/tab-session";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearTabSessionMarker();
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
