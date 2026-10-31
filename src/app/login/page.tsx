import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, enabledProviders } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

interface LoginPageProps {
  searchParams: { callbackUrl?: string; mode?: string; error?: string };
}

// Only same-site paths, so a crafted link can't send people elsewhere after signing in.
function safeCallback(url?: string) {
  if (!url) return "/account";
  try {
    const parsed = new URL(url, "http://local");
    if (parsed.origin === "http://local") return parsed.pathname + parsed.search;
    const site = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : null;
    if (site && parsed.origin === site) return parsed.pathname + parsed.search;
  } catch {
    // Not a URL: fall through.
  }
  return "/account";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = safeCallback(searchParams.callbackUrl);
  const session = await getServerSession(authOptions);
  if (session?.user) redirect(callbackUrl);

  return (
    <LoginForm
      callbackUrl={callbackUrl}
      initialMode={searchParams.mode === "signup" ? "signup" : "signin"}
      providers={enabledProviders}
      authError={searchParams.error}
    />
  );
}
