import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { seedDatabase } from "@/db/seedData";

/**
 * Self-healing bootstrap. Uses CREATE TABLE IF NOT EXISTS so it's safe
 * to run on an existing database — no duplicate-key errors, no DROP.
 * The seed only runs if the users table is empty.
 */

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '' NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '' NOT NULL,
  image_url text DEFAULT '' NOT NULL,
  price_cents integer NOT NULL,
  quantity integer DEFAULT 0 NOT NULL,
  unit text DEFAULT 'each' NOT NULL,
  harvested_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  line1 text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id uuid NOT NULL REFERENCES addresses(id),
  status text DEFAULT 'placed' NOT NULL,
  subtotal_cents integer NOT NULL,
  delivery_fee_cents integer NOT NULL,
  total_cents integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text DEFAULT 'each' NOT NULL,
  quantity integer NOT NULL,
  price_cents integer NOT NULL,
  image_url text DEFAULT '' NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' NOT NULL,
  rejected_by text[] DEFAULT '{}'::text[] NOT NULL,
  driver_lat double precision,
  driver_lng double precision,
  progress double precision DEFAULT 0 NOT NULL,
  proof_photo text,
  payout_cents integer DEFAULT 0 NOT NULL,
  distance_km double precision DEFAULT 0 NOT NULL,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  product_rating integer,
  driver_rating integer,
  comment text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text DEFAULT '' NOT NULL,
  type text DEFAULT 'info' NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
`;

let ready = false;
let inFlight: Promise<void> | null = null;

export function ensureReady(): Promise<void> {
  if (ready) return Promise.resolve();
  if (!inFlight) {
    inFlight = (async () => {
      try {
        // Try a simple query to see if the schema is already there
        await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
      } catch {
        // Tables don't exist yet — create them all
        try {
          await db.execute(sql.raw(DDL));
        } catch (ddlErr) {
          console.error("DDL failed (tables may already exist, continuing):", ddlErr);
        }
      }
      // Only seed if users table is completely empty
      try {
        const rows = await db.select({ id: users.id }).from(users).limit(1);
        if (rows.length === 0) {
          await seedDatabase();
        }
      } catch (seedErr) {
        console.error("Seed check failed:", seedErr);
      }
      ready = true;
    })()
      .catch((e) => {
        console.error("bootstrap failed:", e);
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
