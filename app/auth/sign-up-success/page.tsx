import { AuthPageShell } from "@/components/auth/auth-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authCard, authDescription, authMuted, authTitle } from "@/lib/auth/theme";

export default function Page() {
  return (
    <AuthPageShell>
      <div className="flex flex-col gap-6">
        <Card className={authCard}>
          <CardHeader>
            <CardTitle className={authTitle}>
              Thank you for signing up!
            </CardTitle>
            <CardDescription className={authDescription}>
              Check your email to confirm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={authMuted}>
              You&apos;ve successfully signed up. Please check your email to
              confirm your account before signing in.
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthPageShell>
  );
}
