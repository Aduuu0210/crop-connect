import { AppHeader } from "@/components/AppHeader";
import { OrdersClient } from "@/components/customer/OrdersClient";
import { tryRequireRole } from "@/lib/auth";
import { listCustomerOrders } from "@/lib/queries";
import { ClientAuthResolver } from "@/components/ClientAuthResolver";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await tryRequireRole("customer", token);
  if (!user) {
    return <ClientAuthResolver expectedRole="customer" />;
  }

  const orders = await listCustomerOrders(user.id);

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
            Field-fresh, en route
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            My orders
          </h1>
        </div>
        <OrdersClient initialOrders={orders} />
      </main>
    </div>
  );
}
