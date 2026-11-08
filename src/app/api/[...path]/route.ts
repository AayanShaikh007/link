import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requestDb,
  serviceDb,
  stripeClient,
  origin,
  checked,
  release,
} from "@/lib/server";
import {
  projectSchema,
  bidSchema,
  profileSchema,
  validateFile,
} from "@/lib/domain";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const id = z.string().uuid();
const text = (v: unknown, min = 1) =>
  z.string().trim().min(min).max(4000).parse(v);
async function webhook(req: NextRequest) {
  const stripe = stripeClient(),
    sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json(
      { error: "Webhook configuration missing" },
      { status: 400 },
    );
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }
  if (event.livemode)
    return NextResponse.json(
      { error: "Live events disabled" },
      { status: 400 },
    );
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    if (s.payment_status === "paid" && s.mode === "payment") {
      const pid = id.parse(s.metadata?.project_id);
      if (s.currency !== "cad") throw new Error("Unexpected currency");
      const pi = await stripe.paymentIntents.retrieve(
        s.payment_intent as string,
      );
      const charge =
        typeof pi.latest_charge === "string"
          ? pi.latest_charge
          : pi.latest_charge?.id;
      if (!charge) throw new Error("Charge not available");
      checked(
        await serviceDb().rpc("record_funding", {
          event_id: event.id,
          pid,
          session_id: s.id,
          charge,
          paid_amount: s.amount_total,
        }),
      );
    }
  }
  return NextResponse.json({ received: true });
}
async function handler(req: NextRequest) {
  try {
    const action = req.nextUrl.pathname.split("/").pop();
    if (action === "webhook" && req.method === "POST")
      return await webhook(req);
    const { db, user } = await requestDb(req);
    let result: unknown = { ok: true };
    if (req.method === "GET" && action === "snapshot") {
      const tables = [
        "profiles",
        "projects",
        "bids",
        "messages",
        "assets",
        "payments",
        "disputes",
      ] as const;
      const queries = await Promise.all(
        tables.map((t) => db.from(t).select("*").limit(1000)),
      );
      return NextResponse.json(
        {
          ...Object.fromEntries(queries.map((r, i) => [tables[i], checked(r)])),
          isAdmin: checked(await db.rpc("is_admin")),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    if (req.method !== "POST")
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 },
      );
    if (req.headers.get("origin") !== origin())
      return NextResponse.json({ error: "Origin mismatch" }, { status: 403 });
    if (action === "upload") {
      const form = await req.formData(),
        file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a file.");
      validateFile(file);
      const pid = id.parse(form.get("project_id")),
        kind = z.enum(["attachment", "deliverable"]).parse(form.get("kind")),
        path = `${pid}/${user.id}/${crypto.randomUUID()}.${file.name.split(".").pop()!.toLowerCase()}`;
      checked(
        await db.storage
          .from("project-files")
          .upload(path, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          }),
      );
      result = checked(
        await db
          .from("assets")
          .insert({
            project_id: pid,
            uploader_id: user.id,
            name: file.name.slice(0, 180),
            path,
            size: file.size,
            kind,
          })
          .select()
          .single(),
      );
    } else {
      const raw = await req.json();
      if (action === "project")
        result = checked(
          await db
            .from("projects")
            .insert({ ...projectSchema.parse(raw), owner_id: user.id })
            .select()
            .single(),
        );
      else if (action === "bid")
        result = checked(
          await db
            .from("bids")
            .insert({ ...bidSchema.parse(raw), developer_id: user.id })
            .select()
            .single(),
        );
      else if (action === "accept")
        result = checked(
          await db.rpc("accept_bid", { bid_id: id.parse(raw.bid_id) }),
        );
      else if (action === "profile")
        checked(
          await db
            .from("profiles")
            .update(profileSchema.parse(raw))
            .eq("id", user.id),
        );
      else if (action === "message")
        checked(
          await db
            .from("messages")
            .insert({
              project_id: id.parse(raw.project_id),
              sender_id: user.id,
              body: text(raw.body),
            }),
        );
      else if (action === "workspace") {
        const pid = id.parse(raw.project_id),
          op = z
            .enum(["deliver", "revise", "approve", "dispute", "consent"])
            .parse(raw.action);
        checked(
          await db.rpc("workspace_action", {
            pid,
            action: op,
            detail: typeof raw.detail === "string" ? raw.detail : "",
          }),
        );
        if (op === "approve") {
          try {
            await release(pid);
          } catch {
            return NextResponse.json({
              ok: true,
              notice:
                "Delivery approved. Developer transfer is pending; retry after onboarding is complete.",
            });
          }
        }
      } else if (action === "download") {
        const a = checked(
          await db
            .from("assets")
            .select("*")
            .eq("id", id.parse(raw.asset_id))
            .single(),
        );
        result = checked(
          await db.storage
            .from("project-files")
            .createSignedUrl(a.path, 60, { download: a.name }),
        );
      } else if (action === "upload-url") {
        const pid = id.parse(raw.project_id),
          kind = z.enum(["attachment", "deliverable"]).parse(raw.kind);
        validateFile({ name: raw.name, size: raw.size });
        const p = checked(
          await db.from("projects").select("*").eq("id", pid).single(),
        );
        if (!(
          (kind === "attachment" &&
            p.owner_id === user.id &&
            p.status === "open") ||
          (kind === "deliverable" &&
            p.developer_id === user.id &&
            p.status === "in_progress")
        ))
          throw new Error("Upload not permitted");
        const path = `${pid}/${user.id}/${crypto.randomUUID()}.${String(raw.name).split(".").pop()!.toLowerCase()}`;
        result = checked(
          await db.storage
            .from("project-files")
            .createSignedUploadUrl(path, { upsert: false }),
        );
      } else if (action === "asset") {
        const pid = id.parse(raw.project_id);
        validateFile({ name: raw.name, size: raw.size });
        const path = z
          .string()
          .startsWith(`${pid}/${user.id}/`)
          .parse(raw.path);
        const { data: files, error } = await db.storage
          .from("project-files")
          .list(path.slice(0, path.lastIndexOf("/")), {
            search: path.split("/").pop(),
          });
        if (error || !files?.some((f) => f.name === path.split("/").pop()))
          throw new Error("Upload must finish before recording the file");
        result = checked(
          await db
            .from("assets")
            .insert({
              project_id: pid,
              uploader_id: user.id,
              path,
              name: String(raw.name).slice(0, 180),
              size: raw.size,
              kind: z.enum(["attachment", "deliverable"]).parse(raw.kind),
            })
            .select()
            .single(),
        );
      } else if (action === "onboard") {
        const stripe = stripeClient(),
          svc = serviceDb();
        let account = checked(
          await svc
            .from("connected_accounts")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        );
        if (!account) {
          const a = await stripe.accounts.create(
            {
              type: "express",
              country: "CA",
              email: user.email,
              capabilities: { transfers: { requested: true } },
              metadata: { user_id: user.id },
            },
            { idempotencyKey: `connect-${user.id}` },
          );
          account = checked(
            await svc
              .from("connected_accounts")
              .upsert(
                { user_id: user.id, stripe_account_id: a.id },
                { onConflict: "user_id" },
              )
              .select()
              .single(),
          );
        }
        result = await stripe.accountLinks.create({
          account: account.stripe_account_id,
          refresh_url: `${origin()}/#dashboard`,
          return_url: `${origin()}/#dashboard`,
          type: "account_onboarding",
        });
      } else if (action === "checkout") {
        const pid = id.parse(raw.project_id),
          p = checked(
            await db.from("projects").select("*").eq("id", pid).single(),
          );
        if (p.owner_id !== user.id || p.status !== "awaiting_payment")
          throw new Error("Only the customer may fund an awaiting project.");
        const svc = serviceDb(),
          pay = checked(
            await svc
              .from("payments")
              .select("*")
              .eq("project_id", pid)
              .single(),
          );
        if (pay.status !== "unpaid") throw new Error("Project already funded");
        const stripe = stripeClient();
        let oldId = "initial";
        if (pay.checkout_session_id) {
          const old = await stripe.checkout.sessions.retrieve(
            pay.checkout_session_id,
          );
          if (old.status === "open") return NextResponse.json({ url: old.url });
          if (old.status === "complete")
            throw new Error("Payment processing. Refresh shortly.");
          oldId = old.id;
        }
        const s = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: user.email,
            line_items: [
              {
                price_data: {
                  currency: "cad",
                  unit_amount: pay.amount * 100,
                  product_data: { name: p.title },
                },
                quantity: 1,
              },
            ],
            metadata: { project_id: pid },
            payment_intent_data: {
              transfer_group: pid,
              metadata: { project_id: pid },
            },
            success_url: `${origin()}/#workspace/${pid}`,
            cancel_url: `${origin()}/#workspace/${pid}`,
          },
          { idempotencyKey: `checkout-${pid}-${oldId}` },
        );
        checked(
          await svc
            .from("payments")
            .update({ checkout_session_id: s.id })
            .eq("project_id", pid)
            .eq("status", "unpaid"),
        );
        result = { url: s.url };
      } else if (action === "release") {
        const pid = id.parse(raw.project_id),
          p = checked(
            await db.from("projects").select("*").eq("id", pid).single(),
          );
        if (p.owner_id !== user.id && !checked(await db.rpc("is_admin")))
          throw new Error("Customer or administrator required");
        await release(pid);
      } else if (action === "review") {
        if (!checked(await db.rpc("is_admin")))
          throw new Error("Administrator access required");
        const pid = id.parse(raw.project_id),
          decision = z
            .enum(["resume", "approve", "refund"])
            .parse(raw.decision),
          note = text(raw.note, 10);
        if (decision === "refund") {
          const svc = serviceDb(),
            p = checked(
              await svc.from("projects").select("*").eq("id", pid).single(),
            ),
            pay = checked(
              await svc
                .from("payments")
                .select("*")
                .eq("project_id", pid)
                .single(),
            );
          if (
            p.status !== "disputed" ||
            pay.status !== "funded" ||
            pay.transfer_id
          )
            throw new Error(
              "Only a funded disputed project without a transfer can be refunded.",
            );
          checked(
            await svc.rpc("claim_payment_operation", { pid, op: "refund" }),
          );
          const stripe = stripeClient(),
            existing = (
              await stripe.refunds.list({ charge: pay.charge_id, limit: 100 })
            ).data.find((r) => r.metadata?.project_id === pid),
            refund =
              existing ||
              (await stripe.refunds.create(
                { charge: pay.charge_id, metadata: { project_id: pid } },
                { idempotencyKey: `refund-${pid}` },
              ));
          if (refund.status !== "succeeded")
            throw new Error(
              "Refund pending; inspect Stripe and retry this review.",
            );
          checked(
            await svc.rpc("record_refund", {
              pid,
              rid: refund.id,
              note,
              actor: user.id,
            }),
          );
        } else {
          checked(await db.rpc("resolve_dispute", { pid, decision, note }));
          if (decision === "approve") {
            try {
              await release(pid);
            } catch {
              return NextResponse.json({
                ok: true,
                notice: "Review resolved. Transfer remains pending.",
              });
            }
          }
        }
      } else
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    const message =
      e instanceof z.ZodError
        ? e.issues.map((i) => i.message).join(". ")
        : e instanceof Error
          ? e.message
          : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
export const GET = handler;
export const POST = handler;
