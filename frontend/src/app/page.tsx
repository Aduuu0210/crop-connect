import { getSessionUser } from "@/lib/auth";
import { homeForRole } from "@/lib/utils";
import { LogoMark } from "@/components/ui";
import { LandingHeader } from "@/components/LandingHeader";
import { PlatformStats } from "@/components/PlatformStats";
import {
  ArrowRight,
  Bike,
  Clock3,
  Leaf,
  MapPin,
  ShoppingBasket,
  Sprout,
  Star,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

const MARQUEE = [
  "Heirloom Tomatoes",
  "Raw Wildflower Honey",
  "Pasture-Raised Eggs",
  "Sweet Corn",
  "Honeycrisp Apples",
  "Lacinato Kale",
  "Garden Strawberries",
  "A2 Whole Milk",
];

const STEPS = [
  {
    n: "01",
    icon: ShoppingBasket,
    title: "You order at peak freshness",
    body: "Browse harvest-dated produce from farms within a few miles of your door. Every listing shows exactly when it left the soil.",
  },
  {
    n: "02",
    icon: Sprout,
    title: "The farm packs your batch",
    body: "Farmers get a real-time ping the moment you check out, and your order is packed straight from the field crate.",
  },
  {
    n: "03",
    icon: Truck,
    title: "A neighbor drives it over",
    body: "Local drivers claim the route, and you watch your groceries travel the last few miles live on the map.",
  },
];

const ROLES = [
  {
    icon: ShoppingBasket,
    role: "customer",
    title: "For Customers",
    tagline: "The weekly market, rebuilt for your doorstep.",
    points: ["Harvest-dated produce from nearby farms", "Live order tracking once a driver accepts", "Rate every batch and every delivery"],
    cta: "Start shopping",
  },
  {
    icon: Bike,
    role: "driver",
    title: "For Drivers",
    tagline: "Short local routes. Transparent pay. Your hours.",
    points: ["See distance and payout before you accept", "Pickup addresses unlock only when you commit", "Photo-confirmed drop-offs, instant history"],
    cta: "Start driving",
  },
  {
    icon: Leaf,
    role: "farmer",
    title: "For Farmers",
    tagline: "Your stand, minus the 4 a.m. market setup.",
    points: ["List batches with real photos and harvest dates", "Inventory deducts itself as orders land", "Real-time order alerts on your dashboard"],
    cta: "Start selling",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const token = searchParams ? (await searchParams).token : undefined;
  const user = await getSessionUser(token);
  if (user) redirect(`${homeForRole(user.role)}${token ? `?token=${encodeURIComponent(token)}` : ""}`);

  return (
    <div className="min-h-screen bg-cream">
      {/* ------------------------------- nav ------------------------------- */}
      <LandingHeader />

      {/* ------------------------------- hero ------------------------------ */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(232,163,23,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(74,140,63,0.12),transparent_28%),linear-gradient(180deg,#faf6ee_0%,#f0e9d8_100%)] pt-28 text-forest-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.42]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(27,107,53,0.07) 1.1px, transparent 1.1px)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-harvest/12 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute -right-36 top-1/3 h-[420px] w-[420px] rounded-full bg-leaf/18 blur-[120px]" aria-hidden />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-20">
          <div>
            <p className="fade-up inline-flex items-center gap-2 rounded-full border border-forest-700/10 bg-white/55 px-4 py-1.5 text-[11px] font-bold tracking-[0.22em] text-moss uppercase shadow-[0_10px_24px_-20px_rgba(26,68,37,0.45)]">
              <MapPin className="h-3.5 w-3.5 text-harvest" /> India&rsquo;s farm-to-door marketplace
            </p>
            <h1
              className="fade-up font-display mt-6 text-[13vw] leading-[0.95] font-semibold tracking-tight text-forest-900 sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              From the field,
              <br />
              to your <em className="text-clay not-italic underline decoration-[3px] underline-offset-8">front door</em>
              <br />
              in hours.
            </h1>
            <p className="fade-up mt-6 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg" style={{ animationDelay: "160ms" }}>
              Buy produce at peak freshness directly from local farms — picked this morning,
              packed by the hands that grew it, delivered by a neighbor tonight.
            </p>
            <div className="fade-up mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "240ms" }}>
              <Link
                href="/register?role=customer"
                className="group inline-flex items-center gap-2 rounded-full bg-harvest px-7 py-3.5 text-base font-bold text-forest-950 shadow-[0_14px_36px_-10px_rgba(232,134,28,0.9)] transition hover:-translate-y-0.5 hover:bg-harvest-600"
              >
                Browse the market
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/register?role=farmer"
                className="rounded-full border border-forest-700/16 bg-white/35 px-7 py-3.5 text-base font-bold text-forest-700 transition hover:border-forest-700 hover:bg-forest-700 hover:text-cream"
              >
                Sell your harvest
              </Link>
            </div>

            <dl className="fade-up mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-forest-700/12 pt-8" style={{ animationDelay: "320ms" }}>
              {[
                ["40+", "partner farms"],
                ["3 hrs", "field to door"],
                ["4.9", "community rating"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-3xl font-semibold text-forest-900">{v}</dd>
                  <dd className="mt-1 text-xs font-semibold tracking-wide text-ink-soft uppercase">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* hero image arch */}
          <div className="fade-up relative mx-auto w-full max-w-md lg:max-w-none" style={{ animationDelay: "200ms" }}>
            <div className="relative overflow-hidden rounded-t-[999px] rounded-b-[36px] border border-forest-700/10 bg-white/50 shadow-[0_40px_80px_-36px_rgba(26,68,37,0.38)]">
              <img src="/img/hero-farm.svg" alt="Golden hour over an organic farm" className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-forest-950/22 via-transparent to-transparent" />
            </div>
            <div className="animate-floaty absolute -left-6 top-16 flex items-center gap-2.5 rounded-2xl border border-forest-700/10 bg-cream/92 px-4 py-3 shadow-xl backdrop-blur sm:-left-10">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf/18">
                <Sprout className="h-4.5 w-4.5 text-moss" />
              </span>
              <div>
                <p className="text-xs font-bold text-forest-900">Harvested today</p>
                <p className="text-[11px] text-ink-soft">Green Valley Organics</p>
              </div>
            </div>
            <div className="animate-floaty absolute -right-4 bottom-24 flex items-center gap-2.5 rounded-2xl border border-clay/10 bg-cream/92 px-4 py-3 shadow-xl backdrop-blur sm:-right-8" style={{ animationDelay: "1.2s" }}>
              <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-harvest">
                <Truck className="h-4.5 w-4.5 text-forest-950" />
              </span>
              <div>
                <p className="text-xs font-bold text-forest-900">2.4 mi away</p>
                <p className="text-[11px] text-ink-soft">Darius is en route</p>
              </div>
            </div>
            <div className="absolute -bottom-5 left-8 flex items-center gap-1.5 rounded-full border border-forest-700/10 bg-cream px-4 py-2 text-xs font-bold text-forest-900 shadow-xl">
              <Star className="h-3.5 w-3.5 fill-harvest text-harvest" /> 4.9 from 2,300 neighbors
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="relative border-t border-cream/10 bg-gradient-to-r from-harvest via-harvest-600 to-harvest py-3.5 text-forest-950">
          <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
            {[...MARQUEE, ...MARQUEE].map((item, i) => (
              <span key={i} className="flex items-center gap-8 text-sm font-bold tracking-[0.18em] uppercase">
                {item}
                <Sprout className="h-4 w-4" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- showcase ----------------------------- */}
      <section className="bg-white/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="Crop Connect Brand Logo" className="h-40 w-auto object-contain drop-shadow-2xl" />
            <h2 className="font-display mt-8 text-3xl font-bold tracking-tight text-forest-900 sm:text-4xl">
              Rooted in Community. Growing with Care.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-ink-soft">
              Our new identity represents the handshake between farmers and their neighbors,
              the rolling fields of India, and the bright future we&rsquo;re building together.
            </p>
          </div>
          <PlatformStats />
        </div>
      </section>

      {/* ---------------------------- how it works ---------------------------- */}
      <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-moss uppercase">The short supply chain</p>
            <h2 className="font-display mt-3 max-w-xl text-4xl font-semibold tracking-tight text-forest-900 sm:text-5xl">
              Three hands touch your food. That&rsquo;s the whole story.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink/60">
            No warehouses, no week-long trucking, no mystery. A carrot should travel miles —
            not continents.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="group relative overflow-hidden rounded-[28px] border border-forest-700/10 bg-white/55 p-8 shadow-[0_18px_36px_-26px_rgba(26,68,37,0.22)] transition-all duration-500 hover:-translate-y-1.5 hover:border-forest-700/25 hover:shadow-[0_28px_50px_-24px_rgba(26,68,37,0.3)]"
            >
              <span className="font-display text-6xl font-semibold text-ink/8 transition-colors duration-500 group-hover:text-harvest/25">{s.n}</span>
              <div className="mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-forest-900 text-cream transition-colors duration-500 group-hover:bg-harvest group-hover:text-forest-950">
                <s.icon className="h-5.5 w-5.5" />
              </div>
              <h3 className="font-display mt-5 text-2xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/60">{s.body}</p>
              <span className="absolute right-6 top-8 text-ink/20 transition-colors group-hover:text-harvest">
                <Clock3 className="h-5 w-5" style={{ display: i === 2 ? "none" : undefined }} />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------- roles ------------------------------ */}
      <section id="roles" className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-7xl rounded-[40px] bg-[linear-gradient(180deg,#1a4425_0%,#122e18_100%)] px-6 py-16 text-cream shadow-[0_34px_70px_-34px_rgba(26,68,37,0.55)] sm:px-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display max-w-lg text-4xl font-semibold tracking-tight sm:text-5xl">
              One marketplace. Three ways in.
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-cream/60">
              Whether you grow it, carry it, or cook it — pick your side of the table.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="group flex flex-col rounded-[28px] border border-cream/12 bg-cream/[0.04] p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-harvest/40 hover:bg-cream/[0.07]"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-harvest/15 text-harvest transition-colors duration-500 group-hover:bg-harvest group-hover:text-forest-950">
                  <r.icon className="h-5.5 w-5.5" />
                </div>
                <h3 className="font-display mt-5 text-2xl font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm font-medium text-cream/60 italic">{r.tagline}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-cream/75">
                      <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/register?role=${r.role}`}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-harvest transition group-hover:gap-3"
                >
                  {r.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- footer ------------------------------ */}
      <footer className="border-t border-forest-800/15 bg-forest-950 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <LogoMark dark size="lg" />
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-cream/10 pt-8">
            <p className="text-sm text-cream/40">
              Fresh from farm to your table. © 2026 Crop Connect Cooperative.
            </p>
            <div className="flex gap-6 text-sm font-semibold text-cream/60">
              <Link href="/login" className="link-underline hover:text-cream">Sign in</Link>
              <Link href="/register" className="link-underline hover:text-cream">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
