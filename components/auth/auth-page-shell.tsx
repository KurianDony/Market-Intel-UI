import { Suspense } from "react";
import { MeerkatPeek } from "@/components/auth/meerkat-peek";

type AuthPageShellProps = {
  children: React.ReactNode;
  showMeerkat?: boolean;
};

export function AuthPageShell({
  children,
  showMeerkat = false,
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      {showMeerkat ? (
        <Suspense fallback={null}>
          <MeerkatPeek />
        </Suspense>
      ) : null}
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
