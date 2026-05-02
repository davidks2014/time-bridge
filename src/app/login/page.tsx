import { Suspense } from "react";
import TimeBridgeLogo from "@/components/TimeBridgeLogo";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In",
  description: "Sign in to Time Bridge to access your memories and legacy messages.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "var(--ivory)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TimeBridgeLogo size="md" variant="light" showWordmark animated />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
