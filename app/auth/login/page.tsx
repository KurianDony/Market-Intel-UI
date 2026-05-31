import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <AuthPageShell showMeerkat>
      <LoginForm />
    </AuthPageShell>
  );
}
