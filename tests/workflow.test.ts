import { test } from "node:test";
import assert from "node:assert/strict";
import { demoAction } from "../src/lib/demo";
import { freshSeed, CUSTOMER, DEVELOPER, ADMIN } from "../src/lib/seed";
import { validateFile, projectSchema, human } from "../src/lib/domain";
function setup() {
  let state = freshSeed();
  return {
    get state() {
      return state;
    },
    act(u: string, a: string, p: Record<string, unknown>) {
      const r = demoAction(state, u, a, p);
      state = r.state;
      return r.result;
    },
  };
}
const pid = "csv-cleaner";
function deliver(w: ReturnType<typeof setup>) {
  w.act(DEVELOPER, "asset", {
    project_id: pid,
    asset: {
      id: "file-1",
      project_id: pid,
      uploader_id: DEVELOPER,
      name: "source.zip",
      size: 100,
      path: "file-1",
      kind: "deliverable",
      created_at: new Date().toISOString(),
    },
  });
  w.act(DEVELOPER, "workspace", { project_id: pid, action: "deliver" });
}
test("complete commission includes selection, funding, messaging, revisions and approval", () => {
  const w = setup();
  w.act(CUSTOMER, "accept", { bid_id: "bid-maya" });
  assert.equal(
    w.state.projects.find((p) => p.id === pid)?.status,
    "awaiting_payment",
  );
  assert.throws(() =>
    w.act(DEVELOPER, "workspace", { project_id: pid, action: "deliver" }),
  );
  w.act(CUSTOMER, "checkout", { project_id: pid });
  w.act(DEVELOPER, "message", {
    project_id: pid,
    body: "Starting work on the local tool.",
  });
  deliver(w);
  w.act(CUSTOMER, "workspace", {
    project_id: pid,
    action: "revise",
    detail: "Please add an ISO date preview.",
  });
  assert.equal(
    w.state.projects.find((p) => p.id === pid)?.status,
    "in_progress",
  );
  w.act(DEVELOPER, "workspace", { project_id: pid, action: "deliver" });
  w.act(CUSTOMER, "workspace", { project_id: pid, action: "approve" });
  assert.equal(w.state.projects.find((p) => p.id === pid)?.status, "completed");
  assert.equal(w.state.payments[0].status, "transferred");
  assert.throws(() =>
    w.act(CUSTOMER, "workspace", { project_id: pid, action: "approve" }),
  );
});
test("unrelated users cannot access workspaces or customer-only actions", () => {
  const w = setup();
  assert.throws(() => w.act(DEVELOPER, "accept", { bid_id: "bid-maya" }));
  assert.throws(() =>
    w.act(CUSTOMER, "bid", {
      project_id: pid,
      amount: 100,
      days: 3,
      proposal: "A long enough proposal for a useful local tool.",
    }),
  );
  w.act(CUSTOMER, "accept", { bid_id: "bid-maya" });
  assert.throws(() =>
    w.act("demo-sam", "message", {
      project_id: pid,
      body: "An unauthorized message",
    }),
  );
  assert.throws(() => w.act(DEVELOPER, "checkout", { project_id: pid }));
});
test("disputes pause approval and only administrator can refund", () => {
  const w = setup();
  w.act(CUSTOMER, "accept", { bid_id: "bid-maya" });
  w.act(CUSTOMER, "checkout", { project_id: pid });
  w.act(CUSTOMER, "workspace", {
    project_id: pid,
    action: "dispute",
    detail: "The agreed feature scope was not delivered.",
  });
  assert.throws(() =>
    w.act(CUSTOMER, "workspace", { project_id: pid, action: "approve" }),
  );
  assert.throws(() =>
    w.act(DEVELOPER, "review", {
      project_id: pid,
      decision: "refund",
      note: "Attempting to resolve my own review.",
    }),
  );
  w.act(ADMIN, "review", {
    project_id: pid,
    decision: "refund",
    note: "Scope reviewed and refund agreed by participants.",
  });
  assert.equal(w.state.payments[0].status, "refunded");
  assert.equal(w.state.disputes[0].status, "resolved");
});
test("each participant records and withdraws independent distribution consent", () => {
  const w = setup();
  w.act(CUSTOMER, "accept", { bid_id: "bid-maya" });
  w.act(CUSTOMER, "workspace", {
    project_id: pid,
    action: "consent",
    detail: "yes",
  });
  let p = w.state.projects.find((p) => p.id === pid)!;
  assert.equal(p.customer_distribution_consent, true);
  assert.equal(p.developer_distribution_consent, false);
  w.act(DEVELOPER, "workspace", {
    project_id: pid,
    action: "consent",
    detail: "yes",
  });
  w.act(CUSTOMER, "workspace", {
    project_id: pid,
    action: "consent",
    detail: "no",
  });
  p = w.state.projects.find((p) => p.id === pid)!;
  assert.equal(p.customer_distribution_consent, false);
  assert.equal(p.developer_distribution_consent, true);
});
test("validation rejects executable, oversized, empty and malformed requests", () => {
  assert.throws(() => validateFile({ name: "tool.exe", size: 100 }));
  assert.throws(() =>
    validateFile({ name: "too-large.zip", size: 11 * 1024 * 1024 }),
  );
  assert.throws(() => validateFile({ name: "empty.txt", size: 0 }));
  validateFile({ name: "source.zip", size: 100 });
  assert.equal(
    projectSchema.safeParse({
      title: "x",
      description: "x",
      category: "x",
      budget: -100,
      deadline: "past",
      skills: [],
      resale_eligible: false,
      customer_distribution_consent: false,
    }).success,
    false,
  );
  assert.match(human("2026-12-15"), /15/);
});
