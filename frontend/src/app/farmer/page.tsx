import { AppHeader } from "@/components/AppHeader";
import { FarmerClient } from "@/components/farmer/FarmerClient";
import { tryRequireRole } from "@/lib/auth";
import { getFarmerData, listNotifications } from "@/lib/queries";
import { ClientAuthResolver } from "@/components/ClientAuthResolver";

export const dynamic = "force-dynamic";

export default async function FarmerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await tryRequireRole("farmer", token);
  if (!user) {
    return <ClientAuthResolver expectedRole="farmer" />;
  }

  const [data, notifs] = await Promise.all([getFarmerData(user.id), listNotifications(user.id)]);

  return (
    <div className="min-h-screen">
      <AppHeader
        user={{ name: user.name, email: user.email, role: user.role }}
        links={[{ href: "/farmer", label: "Farm Dashboard" }]}
      />
      <main className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:px-6">
        <FarmerClient initialData={data} initialNotifs={notifs} userName={user.name} />
      </main>
    </div>
  );
}
