import { AppHeader } from "@/components/AppHeader";
import { DriverClient } from "@/components/driver/DriverClient";
import { tryRequireRole } from "@/lib/auth";
import { getDriverActive, getDriverBoard, getDriverStats } from "@/lib/queries";
import { ClientAuthResolver } from "@/components/ClientAuthResolver";

export const dynamic = "force-dynamic";

export default async function DriverPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await tryRequireRole("driver", token);
  if (!user) {
    return <ClientAuthResolver expectedRole="driver" />;
  }

  const [jobs, active, stats] = await Promise.all([
    getDriverBoard(user.id),
    getDriverActive(user.id),
    getDriverStats(user.id),
  ]);

  return (
    <div className="min-h-screen bg-forest-950 text-cream">
      <AppHeader
        theme="dark"
        user={{ name: user.name, email: user.email, role: user.role }}
        links={[{ href: "/driver", label: "Driver HQ" }]}
        status={
          <span className="hidden items-center gap-2 rounded-full border border-leaf/30 bg-leaf/15 px-3.5 py-1.5 text-xs font-bold text-sage sm:flex">
            <span className="pulse-dot relative h-2 w-2 rounded-full bg-leaf text-leaf" />
            Online
          </span>
        }
      />
      <main className="mx-auto max-w-7xl px-4 pt-10 pb-24 sm:px-6">
        <div className="fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-sage uppercase">
              Tonight&rsquo;s routes · India
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Driver HQ
            </h1>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-cream/55">
            Accept a route and the exact pickup and drop-off unlock. Until then,
            they stay between the farm and the customer.
          </p>
        </div>
        <DriverClient initialJobs={jobs} initialActive={active} initialStats={stats} />
      </main>
    </div>
  );
}
