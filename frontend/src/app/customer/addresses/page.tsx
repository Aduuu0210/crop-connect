import { AppHeader } from "@/components/AppHeader";
import { AddressesClient } from "@/components/customer/AddressesClient";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { tryRequireRole } from "@/lib/auth";
import { ClientAuthResolver } from "@/components/ClientAuthResolver";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await tryRequireRole("customer", token);
  if (!user) {
    return <ClientAuthResolver expectedRole="customer" />;
  }

  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));

  const plain = rows.map((a) => ({
    id: a.id,
    label: a.label,
    line1: a.line1,
    city: a.city,
    state: a.state,
    zip: a.zip,
    isDefault: a.isDefault,
  }));

  return (
    <div className="min-h-screen">
      <AppHeader
        user={{ name: user.name, email: user.email, role: user.role }}
        links={[
          { href: "/customer", label: "Market" },
          { href: "/customer/orders", label: "My Orders" },
          { href: "/customer/addresses", label: "Addresses" },
        ]}
      />
      <main className="mx-auto max-w-5xl px-4 pt-10 pb-24 sm:px-6">
        <div className="fade-up">
          <p className="text-[11px] font-bold tracking-[0.22em] text-moss uppercase">
            Where the driver finds you
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Address book
          </h1>
        </div>
        <AddressesClient addresses={plain} />
      </main>
    </div>
  );
}
