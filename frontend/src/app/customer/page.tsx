import { AppHeader } from "@/components/AppHeader";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { tryRequireRole } from "@/lib/auth";
import { listMarketProducts } from "@/lib/queries";
import { Marketplace } from "@/components/customer/Marketplace";
import { ClientAuthResolver } from "@/components/ClientAuthResolver";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function CustomerMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await tryRequireRole("customer", token);
  if (!user) {
    return <ClientAuthResolver expectedRole="customer" />;
  }

  const [products, addrRows] = await Promise.all([
    listMarketProducts(),
    db.select().from(addresses).where(eq(addresses.userId, user.id)),
  ]);

  const addrPlain = addrRows.map((a) => ({
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
      <main className="mx-auto max-w-7xl px-4 pt-10 pb-32 sm:px-6">
        <div className="fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-moss uppercase">
              Today&rsquo;s harvest · India
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Good appetite, {user.name.split(" ")[0]}.
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-ink/55">
            Everything below was harvested within the last few days. It doesn&rsquo;t get
            shorter supply chains than this.
          </p>
        </div>
        <Marketplace products={products} addresses={addrPlain} />
      </main>
    </div>
  );
}
