import { getSessionUser } from "@/lib/auth";
import { homeForRole } from "@/lib/utils";
import { AuthForm } from "@/components/AuthForm";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; token?: string }>;
}) {
  const { role, token } = await searchParams;
  const user = await getSessionUser(token);
  if (user) redirect(`${homeForRole(user.role)}${token ? `?token=${encodeURIComponent(token)}` : ""}`);
  return <AuthForm mode="register" initialRole={role} />;
}
