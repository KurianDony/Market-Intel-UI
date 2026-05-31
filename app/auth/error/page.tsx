import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authCard, authMuted, authTitle } from "@/lib/auth/theme";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      {params?.error ? (
        <p className={authMuted}>Code error: {params.error}</p>
      ) : (
        <p className={authMuted}>An unspecified error occurred.</p>
      )}
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <AuthPageShell>
      <div className="flex flex-col gap-6">
        <Card className={authCard}>
          <CardHeader>
            <CardTitle className={authTitle}>
              Sorry, something went wrong.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense>
              <ErrorContent searchParams={searchParams} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AuthPageShell>
  );
}
