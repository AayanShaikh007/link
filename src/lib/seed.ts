import type { Snapshot } from "./domain";
import { taskTemplates } from "./task-templates";
export const CUSTOMER = "demo-customer",
  DEVELOPER = "demo-developer",
  ADMIN = "demo-admin";
export const seed: Snapshot = {
  isAdmin: false,
  profiles: [
    {
      id: CUSTOMER,
      name: "Aayan Shaikh",
      bio: "Building useful things, one idea at a time.",
      skills: ["Product design", "Automation"],
      completed: 0,
      rating: null,
    },
    {
      id: DEVELOPER,
      name: "Maya Chen",
      bio: "Creative developer making tools that get out of your way. Python, Blender, and the occasional Minecraft world.",
      skills: ["Python", "TypeScript", "Blender"],
      completed: 12,
      rating: 4.9,
    },
    {
      id: "demo-alex",
      name: "Alex Morgan",
      bio: "Independent creator and maker.",
      skills: ["Design"],
      completed: 3,
      rating: 5,
    },
    {
      id: ADMIN,
      name: "Forge Review Team",
      bio: "Marketplace operations.",
      skills: [],
      completed: 0,
      rating: null,
    },
    {
      id: "demo-sam",
      name: "Sam Rivera",
      bio: "I make small tools that solve big headaches.",
      skills: ["Java", "Minecraft", "APIs"],
      completed: 8,
      rating: 4.8,
    },
  ],
  projects: taskTemplates.map(({ delivery_days, ...t }) => ({
    ...t,
    owner_id: t.id === "csv-cleaner" ? CUSTOMER : "demo-alex",
    developer_id: null,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: "open" as const,
    resale_eligible: ["csv-cleaner", "sheet-automation"].includes(t.id),
    customer_distribution_consent: false,
    developer_distribution_consent: false,
    created_at: new Date().toISOString(),
    accepted_bid_id: null,
  })),
  bids: [
    {
      id: "bid-maya",
      project_id: "csv-cleaner",
      developer_id: DEVELOPER,
      amount: 45,
      days: 2,
      proposal:
        "I can fix the existing Python script and add a dry-run preview before writing any CSV changes. I will include sample files, tests for duplicate detection, and a setup guide.",
      created_at: new Date().toISOString(),
    },
    {
      id: "bid-sam",
      project_id: "csv-cleaner",
      developer_id: "demo-sam",
      amount: 55,
      days: 3,
      proposal:
        "I would build a lightweight desktop app with all processing on your machine. I will include configurable date formats and a downloadable report of flagged rows.",
      created_at: new Date().toISOString(),
    },
  ],
  messages: [],
  assets: [],
  payments: [],
  disputes: [],
};
export const freshSeed = (): Snapshot => structuredClone(seed);
