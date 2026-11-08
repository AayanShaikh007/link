import { freshSeed, CUSTOMER, DEVELOPER, ADMIN } from "./seed";
import {
  projectSchema,
  bidSchema,
  profileSchema,
  messageSchema,
  assertParticipant,
  canTransition,
  validateFile,
  type Snapshot,
  type Asset,
} from "./domain";
const key = "forge-demo-v1";
export const personas = [
  { id: CUSTOMER, label: "Aayan · Customer" },
  { id: DEVELOPER, label: "Maya · Developer" },
  { id: ADMIN, label: "Admin · Reviewer" },
];
export function readDemo(): Snapshot {
  try {
    const x = localStorage.getItem(key);
    if (x) return JSON.parse(x);
  } catch {}
  return freshSeed();
}
export function saveDemo(s: Snapshot) {
  localStorage.setItem(key, JSON.stringify(s));
}
export function demoAction(
  input: Snapshot,
  user: string,
  action: string,
  raw: Record<string, unknown>,
): { state: Snapshot; result: any } {
  const s = structuredClone(input);
  s.isAdmin = user === ADMIN;
  const now = new Date().toISOString(),
    uid = () => crypto.randomUUID();
  let result: any = { ok: true };
  const p = s.projects.find((p) => p.id === raw.project_id),
    pay = s.payments.find((x) => x.project_id === raw.project_id);
  if (!s.profiles.some((p) => p.id === user))
    throw new Error("Choose a demo account.");
  if (action === "project") {
    result = {
      ...projectSchema.parse(raw),
      id: uid(),
      owner_id: user,
      developer_id: null,
      accepted_bid_id: null,
      status: "open" as const,
      developer_distribution_consent: false,
      created_at: now,
    };
    s.projects.unshift(result);
  } else if (action === "profile")
    Object.assign(
      s.profiles.find((p) => p.id === user)!,
      profileSchema.parse(raw),
    );
  else if (action === "bid") {
    const d = bidSchema.parse(raw);
    if (!p || p.owner_id === user || p.status !== "open")
      throw new Error("This request is not open for your proposal.");
    if (s.bids.some((b) => b.project_id === p.id && b.developer_id === user))
      throw new Error("You already sent a proposal.");
    result = { ...d, id: uid(), developer_id: user, created_at: now };
    s.bids.push(result);
  } else if (action === "accept") {
    const b = s.bids.find((b) => b.id === raw.bid_id),
      p = s.projects.find((p) => p.id === b?.project_id);
    if (!b || !p || p.owner_id !== user || p.status !== "open")
      throw new Error("This bid cannot be selected.");
    Object.assign(p, {
      developer_id: b.developer_id,
      accepted_bid_id: b.id,
      status: "awaiting_payment",
    });
    s.payments.push({ project_id: p.id, amount: b.amount, status: "unpaid" });
    result = p.id;
  } else if (action === "checkout") {
    if (
      !p ||
      p.owner_id !== user ||
      p.status !== "awaiting_payment" ||
      !pay ||
      pay.status !== "unpaid"
    )
      throw new Error("This project cannot be funded.");
    p.status = "in_progress";
    pay.status = "funded";
    result = { notice: "Simulated funding complete. No money was charged." };
  } else if (action === "message") {
    if (!p) throw new Error("Project not found");
    assertParticipant(p, user);
    if (["open", "completed", "refunded"].includes(p.status))
      throw new Error("Conversation closed");
    s.messages.push({
      id: uid(),
      project_id: p.id,
      sender_id: user,
      body: messageSchema.parse(raw.body),
      created_at: now,
    });
  } else if (action === "asset") {
    if (!p) throw new Error("Project not found");
    assertParticipant(p, user);
    const a = raw.asset as Asset;
    if (!(
      (a.kind === "attachment" && p.owner_id === user && p.status === "open") ||
      (a.kind === "deliverable" &&
        p.developer_id === user &&
        p.status === "in_progress")
    ))
      throw new Error("Upload not permitted");
    s.assets.push(a);
    result = a;
  } else if (action === "workspace") {
    if (!p) throw new Error("Project missing");
    assertParticipant(p, user);
    const op = String(raw.action),
      detail = String(raw.detail || "");
    if (op === "consent") {
      if (!p.resale_eligible)
        throw new Error("Project not eligible for resale");
      if (user === p.owner_id)
        p.customer_distribution_consent = detail === "yes";
      else p.developer_distribution_consent = detail === "yes";
    } else {
      if (!canTransition(p, user, op)) throw new Error("Action not allowed");
      if (op === "deliver") {
        if (
          !s.assets.some(
            (a) => a.project_id === p.id && a.kind === "deliverable",
          )
        )
          throw new Error("Upload a deliverable first");
        p.status = "delivered";
      }
      if (op === "approve") {
        p.status = "completed";
        if (pay) pay.status = "transferred";
        s.profiles.find((x) => x.id === p.developer_id)!.completed++;
      }
      if (op === "revise") {
        if (detail.trim().length < 10)
          throw new Error("Describe the revision in at least 10 characters");
        p.status = "in_progress";
        s.messages.push({
          id: uid(),
          project_id: p.id,
          sender_id: user,
          body: "Revision requested: " + detail,
          created_at: now,
        });
      }
      if (op === "dispute") {
        if (detail.trim().length < 10)
          throw new Error("Describe the issue in at least 10 characters");
        p.status = "disputed";
        const d = s.disputes.find((d) => d.project_id === p.id);
        if (d)
          Object.assign(d, {
            status: "open",
            reason: detail,
            resolution: null,
          });
        else
          s.disputes.push({
            id: uid(),
            project_id: p.id,
            opened_by: user,
            reason: detail,
            status: "open",
            resolution: null,
            created_at: now,
          });
      }
    }
  } else if (action === "review") {
    if (user !== ADMIN || !p || p.status !== "disputed")
      throw new Error("Administrator required");
    if (String(raw.note).trim().length < 10)
      throw new Error("Add review notes of at least 10 characters");
    const d = s.disputes.find((x) => x.project_id === p.id)!;
    d.status = "resolved";
    d.resolution = String(raw.note);
    if (raw.decision === "resume") p.status = "in_progress";
    else if (raw.decision === "refund") {
      p.status = "refunded";
      if (pay) pay.status = "refunded";
    } else if (raw.decision === "approve") {
      p.status = "completed";
      if (pay) pay.status = "transferred";
      s.profiles.find((x) => x.id === p.developer_id)!.completed++;
    } else throw new Error("Invalid decision");
  } else if (action === "release") {
    if (!p || p.owner_id !== user || p.status !== "approved")
      throw new Error("No pending transfer");
    p.status = "completed";
    if (pay) pay.status = "transferred";
  } else throw new Error("Unknown demo action");
  return { state: s, result };
}
function filesDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("forge-files", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function demoUpload(
  file: File,
  project_id: string,
  user: string,
  kind: Asset["kind"],
): Promise<Asset> {
  validateFile(file);
  const id = crypto.randomUUID(),
    db = await filesDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return {
    id,
    project_id,
    uploader_id: user,
    name: file.name,
    size: file.size,
    path: id,
    kind,
    created_at: new Date().toISOString(),
  };
}
export async function demoDownload(a: Asset) {
  const db = await filesDb(),
    blob = await new Promise<Blob>((resolve, reject) => {
      const r = db.transaction("files").objectStore("files").get(a.id);
      r.onsuccess = () =>
        r.result
          ? resolve(r.result)
          : reject(new Error("File not available in this browser"));
      r.onerror = () => reject(r.error);
    });
  db.close();
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = a.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
