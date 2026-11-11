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
  assert.throws(
    () => w.act(CUSTOMER, "workspace", { project_id: pid, action: "approve" }),
    /Confirm you tested/,
  );
  w.act(CUSTOMER, "workspace", {
    project_id: pid,
    action: "approve",
    acceptance_confirmed: true,
  });
  assert.equal(w.state.projects.find((p) => p.id === pid)?.status, "completed");
  assert.equal(w.state.payments[0].status, "transferred");
  assert.throws(() =>
    w.act(CUSTOMER, "workspace", {
      project_id: pid,
      action: "approve",
      acceptance_confirmed: true,
    }),
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
    w.act(CUSTOMER, "workspace", {
      project_id: pid,
      action: "approve",
      acceptance_confirmed: true,
    }),
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

test("micro-task templates produce valid $15–$100 requests and retain larger budgets", async () => {
  const { taskTemplates } = await import("../src/lib/task-templates");
  const { bidSchema } = await import("../src/lib/domain");
  for (const t of taskTemplates) {
    assert.ok(t.budget >= 15 && t.budget <= 100);
    const request = {
      ...t,
      deadline: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
      resale_eligible: false,
      customer_distribution_consent: false,
    };
    assert.equal(projectSchema.safeParse(request).success, true, t.title);
    assert.equal(
      projectSchema.safeParse({ ...request, budget: 15 }).success,
      true,
    );
    assert.equal(
      projectSchema.safeParse({ ...request, budget: 500 }).success,
      true,
    );
    assert.equal(
      projectSchema.safeParse({ ...request, budget: 14 }).success,
      false,
    );
    assert.equal(
      projectSchema.safeParse({ ...request, acceptance_criteria: "" }).success,
      false,
    );
    assert.equal(
      projectSchema.safeParse({ ...request, acceptance_criteria: undefined })
        .success,
      false,
    );
  }
  assert.equal(
    bidSchema.safeParse({
      project_id: "task",
      amount: 15,
      days: 1,
      proposal: "I will configure the bot and provide setup instructions.",
    }).success,
    true,
  );
  assert.equal(
    bidSchema.safeParse({
      project_id: "task",
      amount: 14,
      days: 1,
      proposal: "I will configure the bot and provide setup instructions.",
    }).success,
    false,
  );
});

test("existing browser demo records get legacy criteria without losing state", async () => {
  const { readDemo } = await import("../src/lib/demo");
  const snapshot = freshSeed();
  snapshot.projects[0].status = "completed";
  delete (snapshot.projects[0] as any).acceptance_criteria;
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: () => JSON.stringify(snapshot) },
    configurable: true,
  });
  try {
    const migrated = readDemo();
    assert.equal(migrated.projects[0].status, "completed");
    assert.match(migrated.projects[0].acceptance_criteria, /Legacy request/);
    assert.equal(migrated.bids.length, snapshot.bids.length);
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
