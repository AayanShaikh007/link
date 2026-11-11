export type TaskTemplate = {
  id: string;
  title: string;
  category: string;
  budget: number;
  skills: string[];
  description: string;
  acceptance_criteria: string;
  delivery_days: number;
};
export const taskTemplates: TaskTemplate[] = [
  {
    id: "home-assistant",
    title: "Turn on my desk lights when my computer wakes",
    category: "Smart home",
    budget: 35,
    skills: ["Home Assistant", "YAML"],
    delivery_days: 2,
    description:
      "I already have Home Assistant and compatible desk lights. Help me configure one automation that switches the lights on when my computer wakes. Work from redacted screenshots or a screen-sharing session I control; include setup and rollback instructions.",
    acceptance_criteria:
      "Desk lights turn on when the agreed wake trigger occurs.\nThe automation can be disabled without changing my other routines.\nI receive the YAML or configuration steps plus a short test and rollback guide.",
  },
  {
    id: "ai-workflow",
    title: "Set up a reusable Claude research workflow",
    category: "AI workflows",
    budget: 50,
    skills: ["Claude", "Prompt design"],
    delivery_days: 2,
    description:
      "Help me create a repeatable workflow that turns public articles I supply into a structured research brief with source links and open questions. Use the tools available in my account and provide instructions so I can run it myself. No autonomous purchases or external messages.",
    acceptance_criteria:
      "I can run the workflow on three public articles and receive a structured brief.\nSource links are preserved and uncertain claims are marked.\nI receive reusable instructions and a worked example without sharing my password.",
  },
  {
    id: "discord-bot",
    title: "Configure welcome messages for my Discord server",
    category: "Discord & bots",
    budget: 25,
    skills: ["Discord", "Bot configuration"],
    delivery_days: 1,
    description:
      "Configure an existing bot to greet new members in a welcome channel and show our rules. I own the server and will grant only the permissions needed for this configuration. Include a handover explaining how to edit the message later.",
    acceptance_criteria:
      "A test member joining triggers one welcome message in the selected channel.\nThe message links to the rules and does not ping everyone.\nI can edit or disable the message using the handover instructions.",
  },
  {
    id: "csv-cleaner",
    title: "Fix duplicate rows in my Python CSV script",
    category: "Scripts & utilities",
    budget: 60,
    skills: ["Python", "CSV"],
    delivery_days: 2,
    description:
      "My small Python script imports the same records twice. Fix the duplicate detection, keep the existing column order, and add a preview before writing the cleaned file. I will supply a redacted sample CSV. All processing must stay on my computer.",
    acceptance_criteria:
      "The sample CSV has one row per unique record after processing.\nColumn names and order remain unchanged.\nPreview mode does not overwrite the original file.\nI receive the corrected script, a regression test, and run instructions.",
  },
  {
    id: "minecraft-quests",
    title: "Install a Minecraft mod pack for our private server",
    category: "Game mods",
    budget: 40,
    skills: ["Minecraft", "Mod installation"],
    delivery_days: 2,
    description:
      "Help install a freely distributable mod pack on a private server I own. Confirm the supported game and loader versions first, check compatibility, and document the setup. This is installation and configuration, not a request to create a new mod or bypass anti-cheat.",
    acceptance_criteria:
      "The server starts on the agreed Minecraft and loader versions.\nA test client can join and use the agreed mod-pack features.\nI receive a version list, backup steps, and installation instructions.",
  },
  {
    id: "blender-batch",
    title: "Help me configure a Blender export add-on",
    category: "Plugins & extensions",
    budget: 30,
    skills: ["Blender", "Add-on setup"],
    delivery_days: 1,
    description:
      "I have a licensed export add-on but cannot get its batch-export settings right. Help configure it for my Blender version so selected objects export to separate files. I will provide a sample scene without client content and operate my own computer during setup.",
    acceptance_criteria:
      "The agreed sample objects export into separate files with the selected naming pattern.\nThe original Blender scene remains unchanged.\nI receive a screenshot or written list of the working settings.",
  },
  {
    id: "browser-fix",
    title: "Find why a browser extension stopped loading",
    category: "Tech troubleshooting",
    budget: 20,
    skills: ["Chrome", "Troubleshooting"],
    delivery_days: 1,
    description:
      "A browser extension I use stopped loading after an update. Diagnose it using redacted screenshots and documented settings. Start with reversible steps, explain the cause if it can be established, and do not ask for my login or disable browser security protections.",
    acceptance_criteria:
      "I receive a documented diagnosis with the checks performed.\nIf a supported fix exists, I can reproduce it using the instructions.\nIf no supported fix exists, the limitation and next steps are explained.\nNo passwords or session tokens are collected.",
  },
  {
    id: "sheet-automation",
    title: "Sort new form responses in my spreadsheet",
    category: "Automation",
    budget: 45,
    skills: ["Google Sheets", "Apps Script"],
    delivery_days: 2,
    description:
      "Create a small Apps Script that sorts new responses into the correct sheet tab based on a category column. I will provide a copy containing fake data. Avoid duplicate entries and explain how I can install or remove the script in my own account.",
    acceptance_criteria:
      "Three sample responses appear in the correct category tabs.\nRunning the script twice does not duplicate a response.\nI receive the script, trigger setup instructions, and removal steps.",
  },
];
export const budgetSuggestions = [15, 25, 50, 75, 100];
