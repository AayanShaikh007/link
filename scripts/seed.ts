import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { seed, ADMIN } from "../src/lib/seed";
if (process.env.SEED_CONFIRM !== "sandbox-only")
  throw new Error("Set SEED_CONFIRM=sandbox-only in a sandbox environment.");
if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  throw new Error(
    "Set a sandbox-only SEED_PASSWORD of at least 12 characters in .env.local.",
  );
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const check = (r: any) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const uuid = (s: string) => {
  const hex = createHash("sha256")
    .update("forge-seed-" + s)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const existing = check(await db.auth.admin.listUsers({ perPage: 1000 })).users;
const mapping = new Map<string, string>();
for (const p of seed.profiles) {
  const email = p.id.replace("demo-", "") + "@forge-example.test";
  let user = existing.find((u: any) => u.email === email);
  if (!user)
    user = check(
      await db.auth.admin.createUser({
        email,
        password: process.env.SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { name: p.name },
      }),
    ).user;
  if (!user) throw new Error("User seed failed");
  mapping.set(p.id, user.id);
  check(
    await db
      .from("profiles")
      .update({ name: p.name, bio: p.bio, skills: p.skills })
      .eq("id", user.id),
  );
  if (p.id === ADMIN)
    check(await db.from("admins").upsert({ user_id: user.id }));
}
for (const p of seed.projects) {
  const deadline = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const row = {
    ...p,
    id: uuid(p.id),
    owner_id: mapping.get(p.owner_id),
    created_at: new Date().toISOString(),
    deadline,
  };
  const current = check(
    await db.from("projects").select("id").eq("id", row.id).maybeSingle(),
  );
  if (!current) check(await db.from("projects").insert(row));
}
for (const b of seed.bids) {
  const current = check(
    await db.from("bids").select("id").eq("id", uuid(b.id)).maybeSingle(),
  );
  if (!current)
    check(
      await db
        .from("bids")
        .insert({
          ...b,
          id: uuid(b.id),
          project_id: uuid(b.project_id),
          developer_id: mapping.get(b.developer_id),
        }),
    );
}
console.log(
  "Seeded sandbox users and projects. Sign in with customer@forge-example.test or developer@forge-example.test and your configured sandbox password.",
);
