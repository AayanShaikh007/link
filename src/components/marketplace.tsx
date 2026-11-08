"use client";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Code2,
  Compass,
  Blocks,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Search,
  Plus,
  Clock,
  Gamepad2,
  Zap,
  Terminal,
  BriefcaseBusiness,
  Wallet,
  MessageSquare,
  FileText,
  Upload,
  Download,
  Send,
  Flag,
  RefreshCw,
  Menu,
  X,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useMarketplace } from "@/lib/use-marketplace";
import {
  categories,
  money,
  human,
  initials,
  type Project,
  type Asset,
} from "@/lib/domain";
import { personas } from "@/lib/demo";
import { Button, Field, Badge, Modal } from "./ui";
const go = (s: string) => {
  location.hash = s;
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const icons: Record<string, typeof Code2> = {
  "Game mods": Gamepad2,
  "Plugins & extensions": Blocks,
  Automation: Zap,
  "Scripts & utilities": Terminal,
  "Business software": BriefcaseBusiness,
};
export default function Marketplace() {
  const m = useMarketplace(),
    { data, user, demo, busy } = m;
  const [route, setRoute] = useState("home"),
    [query, setQuery] = useState(""),
    [cat, setCat] = useState("All projects"),
    [sort, setSort] = useState("recent"),
    [onlyOpen, setOnlyOpen] = useState(true),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [tab, setTab] = useState("overview"),
    [mobile, setMobile] = useState(false);
  useEffect(() => {
    const hash = () => {
      setRoute(decodeURIComponent(location.hash.slice(1)) || "home");
      setTab("overview");
      setMobile(false);
    };
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  const [page, id] = route.split("/"),
    me = data.profiles.find((x) => x.id === user),
    p = data.projects.find((x) => x.id === id),
    profile = data.profiles.find((x) => x.id === (id || user)),
    mine = data.projects.filter(
      (p) => p.owner_id === user || p.developer_id === user,
    ),
    active = mine.filter(
      (p) => !["open", "completed", "refunded"].includes(p.status),
    );
  function open(s: string, id = "") {
    setSelected(id);
    setError("");
    setModal(s);
  }
  function requireUser(fn: () => void) {
    user ? fn() : open("auth");
  }
  async function run(fn: () => Promise<any>, message?: string) {
    try {
      const r = await fn();
      if (message) m.notify(message);
      return r;
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submit(
    e: FormEvent<HTMLFormElement>,
    fn: (f: FormData) => Promise<void>,
  ) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    await run(() => fn(f));
  }
  const name = (id: string | null) =>
    data.profiles.find((x) => x.id === id)?.name || "Builder";
  function Card({ p }: { p: Project }) {
    const Icon = icons[p.category] || Code2;
    return (
      <article className="project-card">
        <div className="card-meta">
          <span
            className={
              "category-icon tone-" + categories.indexOf(p.category as any)
            }
          >
            <Icon size={21} />
          </span>
          <span>{p.category}</span>
          <ArrowUpRight size={17} />
        </div>
        <button className="card-title" onClick={() => go("project/" + p.id)}>
          {p.title}
        </button>
        <p>{p.description}</p>
        <div className="tags">
          {p.skills.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="card-price">
          <div>
            <small>Project budget</small>
            <strong>
              {money(p.budget)} <em>CAD</em>
            </strong>
          </div>
          <span>
            <Clock size={12} />
            {human(p.deadline)}
          </span>
        </div>
        <div className="card-author">
          <span className="avatar tiny">{initials(name(p.owner_id))}</span>
          {name(p.owner_id)}
          <i />
          {p.status === "open" ? "Accepting proposals" : "Commission underway"}
        </div>
      </article>
    );
  }
  const filtered = data.projects
    .filter(
      (p) =>
        (cat === "All projects" || p.category === cat) &&
        (!onlyOpen || p.status === "open") &&
        `${p.title} ${p.description} ${p.skills.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "high"
        ? b.budget - a.budget
        : sort === "low"
          ? a.budget - b.budget
          : sort === "deadline"
            ? a.deadline.localeCompare(b.deadline)
            : b.created_at.localeCompare(a.created_at),
    );
  function Board() {
    return (
      <>
        <div className="board-controls">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Search projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects, skills, or ideas..."
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </div>
          <select
            aria-label="Sort projects"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Newest first</option>
            <option value="high">Highest budget</option>
            <option value="low">Lowest budget</option>
            <option value="deadline">Deadline</option>
          </select>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
            />
            Open only
          </label>
        </div>
        <div className="categories">
          {categories.map((c) => (
            <button
              key={c}
              className={cat === c ? "active" : ""}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="section-line">
          <span>{filtered.length} projects to make your own</span>
          <span>All budgets in CAD</span>
        </div>
        <div className="project-grid">
          {filtered.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
        {!filtered.length && (
          <Empty
            icon={<Search />}
            title="No projects found"
            text="Try another category or search term."
          >
            <Button
              secondary
              onClick={() => {
                setQuery("");
                setCat("All projects");
                setOnlyOpen(false);
              }}
            >
              Clear filters
            </Button>
          </Empty>
        )}
      </>
    );
  }
  function Files({
    p,
    attachment = false,
  }: {
    p: Project;
    attachment?: boolean;
  }) {
    const assets = data.assets.filter((a) => a.project_id === p.id);
    return (
      <>
        <p className="muted">
          Files stay private to project participants and authorized reviewers.
          Review downloads before opening.
        </p>
        {assets.map((a) => (
          <div className="file-row" key={a.id}>
            <FileText size={21} />
            <div>
              <strong>{a.name}</strong>
              <small>
                {(a.size / 1024).toFixed(1)} KB · {a.kind}
              </small>
            </div>
            <button
              aria-label={"Download " + a.name}
              className="icon-btn"
              onClick={() => m.download(a)}
            >
              <Download size={18} />
            </button>
          </div>
        ))}
        {!assets.length && (
          <Empty
            icon={<FileText />}
            title="No files yet"
            text="Supporting files and deliverables will appear here."
          />
        )}
        {((attachment && p.owner_id === user && p.status === "open") ||
          (p.developer_id === user && p.status === "in_progress")) && (
          <label className="upload-zone">
            <Upload size={24} />
            <strong>
              {attachment ? "Add an attachment" : "Upload a deliverable"}
            </strong>
            <span>ZIP, PDF, text, Markdown, images · 10 MB max</span>
            <input
              type="file"
              aria-label={
                attachment ? "Add attachment" : "Upload a deliverable"
              }
              accept=".zip,.pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  run(
                    () =>
                      m.upload(
                        file,
                        p.id,
                        attachment ? "attachment" : "deliverable",
                      ),
                    "File uploaded",
                  );
                e.target.value = "";
              }}
            />
          </label>
        )}
      </>
    );
  }
  function Workspace({ p }: { p: Project }) {
    const owner = p.owner_id === user,
      dev = p.developer_id === user;
    if (!owner && !dev && !data.isAdmin)
      return (
        <Empty
          icon={<ShieldCheck />}
          title="This workspace is private"
          text="Only the customer, selected developer, and authorized reviewers can access it."
        />
      );
    const pay = data.payments.find((x) => x.project_id === p.id),
      bid = data.bids.find((b) => b.id === p.accepted_bid_id),
      messages = data.messages
        .filter((x) => x.project_id === p.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    const step =
      p.status === "awaiting_payment"
        ? 0
        : ["in_progress", "disputed"].includes(p.status)
          ? 1
          : p.status === "delivered"
            ? 2
            : 3;
    return (
      <>
        <button className="back" onClick={() => go("dashboard")}>
          <ArrowLeft size={14} />
          My dashboard
        </button>
        <Heading
          eyebrow="PRIVATE WORKSPACE"
          title={p.title}
          text="One shared space. A clear path from idea to delivery."
        >
          <Badge status={p.status} />
        </Heading>
        <div className="steps">
          {["Selected", "Funded", "Delivered", "Approved"].map((s, i) => (
            <div className={i <= step ? "done" : ""} key={s}>
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              {s}
              {i < 3 && <i />}
            </div>
          ))}
        </div>
        <div className="workspace-grid">
          <section className="panel">
            <div className="tabs">
              {["overview", "messages", "files"].map((s) => (
                <button
                  className={tab === s ? "active" : ""}
                  key={s}
                  onClick={() => setTab(s)}
                >
                  {s === "messages"
                    ? `Messages (${messages.length})`
                    : s === "files"
                      ? `Files (${data.assets.filter((a) => a.project_id === p.id).length})`
                      : "Overview"}
                </button>
              ))}
            </div>
            <div className="panel-body">
              {tab === "overview" ? (
                <>
                  <h3>The brief</h3>
                  <p className="preserve">{p.description}</p>
                  <div className="tags">
                    {p.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <div className="info-grid">
                    <div>
                      <small>Customer</small>
                      <strong>{name(p.owner_id)}</strong>
                    </div>
                    <div>
                      <small>Developer</small>
                      <strong>{name(p.developer_id)}</strong>
                    </div>
                    <div>
                      <small>Agreed price</small>
                      <strong>{money(pay?.amount || p.budget)} CAD</strong>
                    </div>
                    <div>
                      <small>Estimated delivery</small>
                      <strong>{bid?.days || "—"} days after funding</strong>
                    </div>
                  </div>
                  <div className="soft-box">
                    <Blocks size={21} />
                    <div>
                      <strong>Commercial distribution</strong>
                      <p>
                        {p.resale_eligible
                          ? "Marked for possible resale. Both parties must agree independently; a separate rights agreement is still needed."
                          : "This request is not marked for resale."}
                      </p>
                      {p.resale_eligible && (
                        <>
                          <p>
                            Customer:{" "}
                            {p.customer_distribution_consent
                              ? "Agreed"
                              : "Not agreed"}{" "}
                            · Developer:{" "}
                            {p.developer_distribution_consent
                              ? "Agreed"
                              : "Not agreed"}
                          </p>
                          {(owner || dev) && (
                            <Button
                              secondary
                              disabled={busy}
                              onClick={() =>
                                run(() =>
                                  m.act("workspace", {
                                    project_id: p.id,
                                    action: "consent",
                                    detail: (
                                      owner
                                        ? p.customer_distribution_consent
                                        : p.developer_distribution_consent
                                    )
                                      ? "no"
                                      : "yes",
                                  }),
                                )
                              }
                            >
                              {(
                                owner
                                  ? p.customer_distribution_consent
                                  : p.developer_distribution_consent
                              )
                                ? "Withdraw my consent"
                                : "Record my consent"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : tab === "files" ? (
                <>
                  <h3>Project files</h3>
                  <Files p={p} />
                </>
              ) : (
                <>
                  <div className="message-list">
                    {!messages.length && (
                      <Empty
                        icon={<MessageSquare />}
                        title="Start the conversation"
                        text="Keep requirements, decisions, and feedback in one place."
                      />
                    )}
                    {messages.map((x) => (
                      <div
                        className={
                          "message " + (x.sender_id === user ? "own" : "")
                        }
                        key={x.id}
                      >
                        <span className="avatar tiny">
                          {initials(name(x.sender_id))}
                        </span>
                        <div>
                          <strong>
                            {name(x.sender_id)}{" "}
                            <small>{human(x.created_at)}</small>
                          </strong>
                          <p>{x.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(owner || dev) &&
                    !["completed", "refunded"].includes(p.status) && (
                      <form
                        className="compose"
                        onSubmit={(e) => {
                          const form = e.currentTarget;
                          submit(e, async (f) => {
                            await m.act("message", {
                              project_id: p.id,
                              body: f.get("body"),
                            });
                            form.reset();
                          });
                        }}
                      >
                        <input
                          name="body"
                          aria-label="Message"
                          placeholder="Write a message..."
                          maxLength={4000}
                          required
                        />
                        <button disabled={busy} aria-label="Send message">
                          <Send size={18} />
                        </button>
                      </form>
                    )}
                </>
              )}
            </div>
          </section>
          <aside>
            <section className="panel payment-panel">
              <div className="eyebrow">PROJECT PAYMENT</div>
              <h2>
                {money(pay?.amount || p.budget)} <small>CAD</small>
              </h2>
              <div className="payment-state">
                <ShieldCheck size={18} />
                {pay?.status === "funded"
                  ? "Funded · awaiting approval"
                  : pay?.status === "transferred"
                    ? "Transferred to developer"
                    : pay?.status === "refunded"
                      ? "Refunded to customer"
                      : "Not yet funded"}
              </div>
              <p className="muted">
                {demo
                  ? "Demo simulation. No real charge or transfer takes place."
                  : "Stripe test mode. A developer transfer and bank payout are separate steps."}
              </p>
              {owner && p.status === "awaiting_payment" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const r = await m.act("checkout", { project_id: p.id });
                      if (r.url) location.href = r.url;
                    })
                  }
                >
                  <Wallet size={16} />
                  {demo
                    ? "Simulate project funding"
                    : "Fund in Stripe test mode"}
                </Button>
              )}
              {dev && p.status === "awaiting_payment" && (
                <p className="notice">
                  Wait for confirmed funding before starting work.
                </p>
              )}
              {dev && p.status === "in_progress" && (
                <>
                  <Button secondary onClick={() => setTab("files")}>
                    <Upload size={16} />
                    Add deliverable
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          m.act("workspace", {
                            project_id: p.id,
                            action: "deliver",
                          }),
                        "Delivery submitted",
                      )
                    }
                  >
                    Submit for review
                    <ArrowRight size={16} />
                  </Button>
                </>
              )}
              {owner && p.status === "delivered" && (
                <>
                  <Button secondary onClick={() => setTab("files")}>
                    Review delivered files
                  </Button>
                  <Button disabled={busy} onClick={() => open("approve", p.id)}>
                    <Check size={16} />
                    Approve delivery
                  </Button>
                  <button
                    className="text-link centered"
                    onClick={() => open("revise", p.id)}
                  >
                    Request a revision
                  </button>
                </>
              )}
              {owner && p.status === "approved" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => m.act("release", { project_id: p.id }),
                      "Transfer completed",
                    )
                  }
                >
                  Retry developer transfer
                </Button>
              )}
              {["in_progress", "delivered"].includes(p.status) &&
                (owner || dev) && (
                  <button
                    className="text-link centered"
                    onClick={() => open("dispute", p.id)}
                  >
                    <Flag size={13} />
                    Report an issue
                  </button>
                )}
              {p.status === "disputed" && (
                <p className="notice">
                  Payment release is paused during administrator review.
                </p>
              )}
              {p.status === "completed" && (
                <p className="success">
                  <CheckCheck size={18} />
                  Another idea brought to life.
                </p>
              )}
            </section>
            <div className="help-card">
              <MessageSquare size={23} />
              <h3>Keep the details here.</h3>
              <p>
                Use project messages for scope, feedback, and handover notes. It
                helps everyone stay on the same page.
              </p>
            </div>
          </aside>
        </div>
      </>
    );
  }
  return (
    <div className="app">
      <aside className={"sidebar " + (mobile ? "show" : "")}>
        <a className="brand" href="#home">
          <span>
            <Code2 size={22} />
          </span>
          forge<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-caption">A LITTLE IDEA. A REAL THING.</div>
        <nav>
          {[
            ["home", "Discover", Compass],
            ["marketplace", "Explore projects", Blocks],
            ["dashboard", "My dashboard", LayoutDashboard],
            ["profile/" + user, "My profile", Users],
            ...(data.isAdmin ? [["admin", "Admin review", ShieldCheck]] : []),
          ].map(([s, label, Icon]) => {
            const I = Icon as typeof Code2;
            return (
              <a
                key={String(s)}
                href={"#" + s}
                className={page === String(s).split("/")[0] ? "active" : ""}
              >
                <I size={19} />
                {String(label)}
                {s === "dashboard" && active.length > 0 && (
                  <small>{active.length}</small>
                )}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="idea-card">
            <span>✳</span>
            <h3>
              Your “what if”
              <br />
              starts here.
            </h3>
            <p>
              Find the person who can
              <br />
              bring your idea to life.
            </p>
            <button onClick={() => requireUser(() => go("new"))}>
              Post a request
              <ArrowUpRight size={17} />
            </button>
          </div>
          <p className="sidebar-foot">
            <i />
            Built for the builders.
          </p>
        </div>
      </aside>
      {mobile && (
        <div className="nav-overlay" onClick={() => setMobile(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            aria-label="Open menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={13} />
            <strong>
              {(
                {
                  home: "Discover",
                  marketplace: "Explore projects",
                  project: "Project details",
                  new: "Post a request",
                  workspace: "Project workspace",
                  dashboard: "My dashboard",
                  profile: "Profile",
                  admin: "Admin review",
                } as Record<string, string>
              )[page] || "Discover"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="beta">BETA</span>
            {demo ? (
              <div className="persona">
                <span className="avatar tiny">
                  {initials(me?.name || "Aayan")}
                </span>
                <select
                  aria-label="Demo account"
                  value={user}
                  onChange={(e) => m.persona(e.target.value)}
                >
                  {personas.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : user ? (
              <>
                <button onClick={() => go("profile/" + user)}>
                  {me?.name || "My account"}
                </button>
                <button
                  aria-label="Sign out"
                  className="icon-btn"
                  onClick={() => m.signout()}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Button secondary onClick={() => open("auth")}>
                Sign in
              </Button>
            )}
          </div>
        </header>
        <main>
          <div className="mode-banner">
            <span>
              <i />
              {demo ? "Interactive demo" : "Connected beta"}
              <em>/</em>
              {demo
                ? "Try both sides of a commission. Changes stay in this browser."
                : "Stripe test mode · Live payments disabled"}
            </span>
            {demo && (
              <button onClick={() => open("help")}>
                How to try it
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          {m.error && (
            <div className="error" role="alert">
              {m.error}
              <button aria-label="Dismiss error" onClick={() => m.setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {!m.ready ? (
            <Empty icon={<RefreshCw />} title="Opening your workspace…" />
          ) : page === "home" ? (
            <>
              <section className="hero">
                <div>
                  <div className="eyebrow">
                    <i />
                    THE MARKETPLACE FOR YOUR NEXT IDEA
                  </div>
                  <h1>
                    Software that doesn’t
                    <br />
                    exist. <em>Yet.</em>
                  </h1>
                  <p>
                    A game mod. A time-saving script. That one plugin you wish
                    existed. Post your idea and find a developer to make it
                    real.
                  </p>
                  <div className="actions">
                    <Button onClick={() => requireUser(() => go("new"))}>
                      Bring an idea
                      <ArrowUpRight size={18} />
                    </Button>
                    <Button secondary onClick={() => go("marketplace")}>
                      Find a project
                      <ArrowRight size={17} />
                    </Button>
                  </div>
                  <div className="hero-note">
                    <ShieldCheck size={16} />
                    Agree on the scope. Fund the project. Approve the result.
                  </div>
                </div>
                <div className="hero-art">
                  <span className="art-label">
                    <i />
                    small ideas, big possibilities
                  </span>
                  <div className="code-window">
                    <div className="window-head">
                      <i />
                      <i />
                      <i />
                      <span>your-next-idea.ts</span>
                      <Code2 size={13} />
                    </div>
                    <div className="code">
                      <p>// a little less “I wish...”</p>
                      <div>
                        <b>const</b> idea = {"{"}
                      </div>
                      <div className="indent">
                        what: <em>"something useful"</em>,
                      </div>
                      <div className="indent">
                        builtBy: <em>"someone brilliant"</em>,
                      </div>
                      <div className="indent">
                        possibilities: <u>Infinity</u>
                      </div>
                      <div>{"}"};</div>
                      <br />
                      <div>
                        <b>await</b> forge.<span>makeItReal</span>(idea);
                      </div>
                    </div>
                    <div className="window-foot">
                      <i />
                      Ready to build<span>TypeScript</span>
                    </div>
                  </div>
                  <div className="art-star">✳</div>
                  <div className="floating">
                    <span>
                      <Check size={21} />
                    </span>
                    <div>
                      <strong>Idea → reality</strong>
                      <small>Made by a real human.</small>
                    </div>
                    <Sparkles size={20} />
                  </div>
                </div>
              </section>
              <div className="value-strip">
                {[
                  [
                    "Describe your idea",
                    "Big enough to matter. Small enough to ship.",
                  ],
                  [
                    "Find your developer",
                    "Compare proposals. Choose your person.",
                  ],
                  [
                    "Make it happen",
                    "One workspace, from first draft to delivery.",
                  ],
                ].map(([t, d], i) => (
                  <div key={t}>
                    <span>0{i + 1}</span>
                    <strong>{t}</strong>
                    <p>{d}</p>
                  </div>
                ))}
              </div>
              <section className="project-section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">THE NEXT THING STARTS HERE</div>
                    <h2>Good ideas. Open opportunities.</h2>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => go("marketplace")}
                  >
                    Explore all projects
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                {Board()}
              </section>
              <div className="bottom-cta">
                <span>✳</span>
                <div>
                  <h2>Someone out there can build it.</h2>
                  <p>Give your idea a place to start.</p>
                </div>
                <Button secondary onClick={() => requireUser(() => go("new"))}>
                  Post your first request
                  <ArrowUpRight size={17} />
                </Button>
              </div>
            </>
          ) : page === "marketplace" ? (
            <>
              <Heading
                eyebrow="FIND YOUR NEXT BUILD"
                title="Small projects. Real possibilities."
                text="Put your skills to work on something someone actually needs."
              >
                <Button onClick={() => requireUser(() => go("new"))}>
                  <Plus size={17} />
                  Post a request
                </Button>
              </Heading>
              {Board()}
            </>
          ) : page === "new" ? (
            <>
              <Heading
                eyebrow="LET’S MAKE IT REAL"
                title="What do you have in mind?"
                text="A clear brief is the first step toward a great build."
              />
              {!user ? (
                <Empty title="Sign in to post a request">
                  <Button onClick={() => open("auth")}>Sign in</Button>
                </Empty>
              ) : (
                <div className="form-grid">
                  <form
                    className="panel request-form"
                    onSubmit={(e) =>
                      submit(e, async (f) => {
                        const result = await m.act("project", {
                          title: f.get("title"),
                          description: f.get("description"),
                          category: f.get("category"),
                          budget: f.get("budget"),
                          deadline: f.get("deadline"),
                          skills: String(f.get("skills"))
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                          resale_eligible: f.get("resale") === "on",
                          customer_distribution_consent:
                            f.get("consent") === "on",
                        });
                        const file = f.get("attachment") as File;
                        if (file?.size) {
                          try {
                            await m.upload(file, result.id, "attachment");
                          } catch {
                            m.notify(
                              "Request posted; attachment failed. Reopen the request to retry.",
                            );
                          }
                        }
                        go("project/" + result.id);
                        m.notify("Your request is live");
                      })
                    }
                  >
                    <Field
                      label="Give your project a title"
                      hint="Be specific about what the finished thing should do."
                    >
                      <input
                        name="title"
                        required
                        minLength={8}
                        maxLength={120}
                        placeholder="e.g. A Blender add-on that batch exports my assets"
                      />
                    </Field>
                    <Field
                      label="Tell developers about your idea"
                      hint="Include the problem, expected result, supported versions, and acceptance criteria."
                    >
                      <textarea
                        rows={7}
                        name="description"
                        required
                        minLength={40}
                        maxLength={10000}
                        placeholder="Here’s what I’m trying to do..."
                      />
                    </Field>
                    <div className="form-two">
                      <Field label="Category">
                        <select name="category">
                          {categories.slice(1).map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field
                        label="Budget (CAD)"
                        hint="Your target total · $25–$10,000"
                      >
                        <input
                          type="number"
                          name="budget"
                          required
                          min={25}
                          max={10000}
                          placeholder="350"
                        />
                      </Field>
                    </div>
                    <div className="form-two">
                      <Field label="Target deadline">
                        <input
                          name="deadline"
                          required
                          type="date"
                          min={new Date(Date.now() + 86400000)
                            .toISOString()
                            .slice(0, 10)}
                        />
                      </Field>
                      <Field
                        label="Skills / tools"
                        hint="Up to 8, separated by commas"
                      >
                        <input
                          name="skills"
                          placeholder="Python, Blender, API"
                        />
                      </Field>
                    </div>
                    <Field
                      label="Supporting file (optional)"
                      hint="Private to you and your selected developer · 10 MB max"
                    >
                      <input
                        type="file"
                        name="attachment"
                        accept=".zip,.pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                      />
                    </Field>
                    <div className="check-box">
                      <label>
                        <input name="resale" type="checkbox" />
                        <span>
                          Consider this project for future resale
                          <small>
                            No automatic listings or royalty payouts.
                          </small>
                        </span>
                      </label>
                      <label>
                        <input name="consent" type="checkbox" />
                        <span>
                          I’m open to commercial distribution
                          <small>
                            Your developer must agree independently.
                          </small>
                        </span>
                      </label>
                    </div>
                    <ErrorText text={error} />
                    <div className="form-footer">
                      <small>
                        Only request work you have the right to commission.
                      </small>
                      <Button disabled={busy} type="submit">
                        Publish request
                        <ArrowUpRight size={17} />
                      </Button>
                    </div>
                  </form>
                  <aside className="brief-tips">
                    <span>✳</span>
                    <h2>
                      Good briefs get
                      <br />
                      great proposals.
                    </h2>
                    <p>
                      You don’t need to know the technical solution. Start with
                      the problem.
                    </p>
                    {[
                      "Explain what you use today",
                      "Describe your ideal result",
                      "Share examples or references",
                      "Be realistic about timing",
                    ].map((t) => (
                      <div key={t}>
                        <Check size={16} />
                        {t}
                      </div>
                    ))}
                    <hr />
                    <ShieldCheck size={23} />
                    <h3>You choose when it’s ready.</h3>
                    <p>
                      Review the delivery and request revisions before approval.
                      This beta uses simulated or Stripe test payments.
                    </p>
                  </aside>
                </div>
              )}
            </>
          ) : page === "project" && p ? (
            <>
              <button className="back" onClick={() => go("marketplace")}>
                <ArrowLeft size={14} />
                Back to projects
              </button>
              <div className="detail-grid">
                <div>
                  <section className="panel project-detail">
                    <div className="section-line">
                      <span>{p.category}</span>
                      <Badge status={p.status} />
                    </div>
                    <h1>{p.title}</h1>
                    <div className="posted">
                      <span className="avatar tiny">
                        {initials(name(p.owner_id))}
                      </span>
                      <button onClick={() => go("profile/" + p.owner_id)}>
                        {name(p.owner_id)}
                      </button>
                      <span>Posted {human(p.created_at)}</span>
                    </div>
                    <hr />
                    <h3>The project</h3>
                    <p className="preserve">{p.description}</p>
                    <h3>Skills & tools</h3>
                    <div className="tags">
                      {p.skills.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    {p.resale_eligible && (
                      <div className="soft-box">
                        <Blocks size={21} />
                        <div>
                          <strong>Room for a second life</strong>
                          <p>
                            Eligible for future resale, subject to rights and
                            both parties’ consent.
                          </p>
                        </div>
                      </div>
                    )}
                    {p.owner_id === user && p.status === "open" && (
                      <>
                        <h3>Private supporting files</h3>
                        <Files p={p} attachment />
                      </>
                    )}
                  </section>
                  <div className="section-heading lower">
                    <h2>
                      {p.owner_id === user
                        ? "Developer proposals"
                        : "Your proposal"}
                    </h2>
                    <span className="muted">Proposals are private</span>
                  </div>
                  {data.bids
                    .filter(
                      (b) =>
                        b.project_id === p.id &&
                        (p.owner_id === user || b.developer_id === user),
                    )
                    .map((b) => (
                      <section className="panel proposal" key={b.id}>
                        <div className="proposal-head">
                          <button
                            className="person"
                            onClick={() => go("profile/" + b.developer_id)}
                          >
                            <span className="avatar">
                              {initials(name(b.developer_id))}
                            </span>
                            <span>
                              <strong>{name(b.developer_id)}</strong>
                              <small>
                                {data.profiles.find(
                                  (x) => x.id === b.developer_id,
                                )?.completed || 0}{" "}
                                completed projects
                              </small>
                            </span>
                          </button>
                          <div>
                            <strong>{money(b.amount)}</strong>
                            <small>{b.days} day delivery</small>
                          </div>
                        </div>
                        <p className="preserve">{b.proposal}</p>
                        {p.owner_id === user && p.status === "open" && (
                          <Button
                            secondary
                            disabled={busy}
                            onClick={() => open("select", b.id)}
                          >
                            Select developer
                            <ArrowRight size={15} />
                          </Button>
                        )}
                        {p.accepted_bid_id === b.id && (
                          <p className="success">
                            <Check size={15} />
                            Selected developer
                          </p>
                        )}
                      </section>
                    ))}
                  {!data.bids.some(
                    (b) =>
                      b.project_id === p.id &&
                      (p.owner_id === user || b.developer_id === user),
                  ) && (
                    <Empty
                      icon={<MessageSquare />}
                      title={
                        p.owner_id === user
                          ? "Your next collaborator is out there."
                          : "Put your skills forward."
                      }
                      text={
                        p.owner_id === user
                          ? "Developer proposals will appear here."
                          : "Send a thoughtful proposal with a clear price and timeline."
                      }
                    />
                  )}
                </div>
                <aside>
                  <section className="panel payment-panel">
                    <div className="eyebrow">PROJECT BUDGET</div>
                    <h2>
                      {money(p.budget)} <small>CAD</small>
                    </h2>
                    <div className="budget-row">
                      <Clock size={17} />
                      Target deadline<strong>{human(p.deadline)}</strong>
                    </div>
                    <div className="budget-row">
                      <BriefcaseBusiness size={17} />
                      Project type<strong>Fixed price</strong>
                    </div>
                    {p.status === "open" &&
                      p.owner_id !== user &&
                      !data.bids.some(
                        (b) => b.project_id === p.id && b.developer_id === user,
                      ) && (
                        <Button
                          onClick={() => requireUser(() => open("bid", p.id))}
                        >
                          Submit a proposal
                          <ArrowUpRight size={17} />
                        </Button>
                      )}
                    {p.owner_id === user && p.status === "open" && (
                      <p className="notice">
                        This is your request. Compare proposals and choose your
                        developer.
                      </p>
                    )}
                    {p.developer_id &&
                      (p.owner_id === user || p.developer_id === user) && (
                        <Button onClick={() => go("workspace/" + p.id)}>
                          Open workspace
                          <ArrowRight size={17} />
                        </Button>
                      )}
                    <p className="tiny-note">
                      <ShieldCheck size={13} />
                      Work begins after confirmed funding.
                    </p>
                  </section>
                  <div className="help-card">
                    <Code2 size={24} />
                    <h3>Build something you’re proud of.</h3>
                    <p>
                      Be specific, communicate clearly, and agree on what “done”
                      looks like.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          ) : page === "workspace" && p ? (
            Workspace({ p })
          ) : page === "dashboard" ? (
            <>
              <Heading
                eyebrow="YOUR WORK, IN ONE PLACE"
                title={"Hey, " + (me?.name.split(" ")[0] || "builder") + "."}
                text="Pick up where you left off. Make something happen."
              >
                <Button onClick={() => requireUser(() => go("new"))}>
                  <Plus size={17} />
                  New request
                </Button>
              </Heading>
              {!user ? (
                <Empty title="Sign in to view your projects">
                  <Button onClick={() => open("auth")}>Sign in</Button>
                </Empty>
              ) : (
                <>
                  <div className="stats-grid">
                    {[
                      ["Active projects", active.length, "Ideas in the making"],
                      [
                        "Completed builds",
                        mine.filter((p) => p.status === "completed").length,
                        "From brief to handover",
                      ],
                      [
                        "Your proposals",
                        data.bids.filter((b) => b.developer_id === user).length,
                        "New opportunities",
                      ],
                      [
                        demo ? "Simulated funded value" : "Test funded value",
                        money(
                          data.payments
                            .filter(
                              (x) =>
                                ["funded", "transferred"].includes(x.status) &&
                                mine.some((p) => p.id === x.project_id),
                            )
                            .reduce((s, p) => s + p.amount, 0),
                        ),
                        "Across your projects",
                      ],
                    ].map(([t, v, d]) => (
                      <div className="stat" key={t}>
                        <span>
                          {t}
                          <BriefcaseBusiness size={18} />
                        </span>
                        <strong>{v}</strong>
                        <small>{d}</small>
                      </div>
                    ))}
                  </div>
                  <div className="section-heading">
                    <h2>Your projects</h2>
                    <button
                      className="text-link"
                      onClick={() => go("marketplace")}
                    >
                      Find your next project
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <section className="panel">
                    {mine.map((p) => (
                      <button
                        className="dashboard-row"
                        key={p.id}
                        onClick={() =>
                          go(
                            (p.status === "open" ? "project/" : "workspace/") +
                              p.id,
                          )
                        }
                      >
                        <span className="category-icon">
                          <Code2 size={20} />
                        </span>
                        <span className="row-title">
                          <strong>{p.title}</strong>
                          <small>
                            {p.owner_id === user ? "Customer" : "Developer"} ·{" "}
                            {p.category}
                          </small>
                        </span>
                        <Badge status={p.status} />
                        <strong>
                          {money(
                            data.payments.find((x) => x.project_id === p.id)
                              ?.amount || p.budget,
                          )}
                        </strong>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                    {!mine.length && (
                      <Empty
                        icon={<BriefcaseBusiness />}
                        title="Your first project starts with an idea."
                        text="Post a request or send a proposal to get started."
                      />
                    )}
                  </section>
                  <div className="section-heading lower">
                    <h2>Proposals you’ve sent</h2>
                    {!demo && (
                      <Button
                        secondary
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const r = await m.act("onboard", {});
                            location.href = r.url;
                          })
                        }
                      >
                        Set up Stripe test payouts
                        <Wallet size={16} />
                      </Button>
                    )}
                  </div>
                  <section className="panel">
                    {data.bids
                      .filter((b) => b.developer_id === user)
                      .map((b) => (
                        <button
                          className="dashboard-row"
                          key={b.id}
                          onClick={() => go("project/" + b.project_id)}
                        >
                          <span className="row-title">
                            <strong>
                              {
                                data.projects.find((p) => p.id === b.project_id)
                                  ?.title
                              }
                            </strong>
                            <small>
                              {b.days} days ·{" "}
                              {data.projects.find((p) => p.id === b.project_id)
                                ?.accepted_bid_id === b.id
                                ? "Selected"
                                : "Submitted"}
                            </small>
                          </span>
                          <strong>{money(b.amount)}</strong>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    {!data.bids.some((b) => b.developer_id === user) && (
                      <Empty text="No proposals yet. Find a project that fits your skills." />
                    )}
                  </section>
                  {demo && (
                    <div className="demo-reset">
                      <span>
                        Start fresh with the original sample projects.
                      </span>
                      <button
                        className="text-link"
                        onClick={() => open("reset")}
                      >
                        <RefreshCw size={14} />
                        Reset demo
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : page === "profile" && profile ? (
            <>
              <Heading
                eyebrow="MEET THE BUILDER"
                title={"A little about " + profile.name.split(" ")[0] + "."}
              >
                {profile.id === user && (
                  <Button secondary onClick={() => open("profile")}>
                    Edit profile
                  </Button>
                )}
              </Heading>
              <section className="panel profile-panel">
                <span className="avatar huge">{initials(profile.name)}</span>
                <div>
                  <h2>{profile.name}</h2>
                  <p>{profile.bio || "This builder is getting started."}</p>
                  <div className="tags">
                    {profile.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <div className="profile-stats">
                    <strong>
                      {profile.completed}
                      <small>Completed projects</small>
                    </strong>
                    <strong>
                      {profile.rating || "—"}
                      <small>
                        {profile.rating
                          ? "Sample demo rating"
                          : "No reviews yet"}
                      </small>
                    </strong>
                    <strong>
                      <ShieldCheck size={25} />
                      <small>Community member</small>
                    </strong>
                  </div>
                </div>
              </section>
              <h2 className="lower">Completed on Forge</h2>
              <div className="project-grid">
                {data.projects
                  .filter(
                    (p) =>
                      (p.owner_id === profile.id ||
                        p.developer_id === profile.id) &&
                      p.status === "completed",
                  )
                  .map((p) => (
                    <Card p={p} key={p.id} />
                  ))}
              </div>
              {!data.projects.some(
                (p) =>
                  (p.owner_id === profile.id ||
                    p.developer_id === profile.id) &&
                  p.status === "completed",
              ) && <Empty text="Completed builds will appear here." />}
            </>
          ) : page === "admin" ? (
            <>
              <Heading
                eyebrow="MARKETPLACE OPERATIONS"
                title="A fair review, with context."
                text="Review concerns and record a clear resolution."
              />
              {!data.isAdmin ? (
                <Empty
                  icon={<ShieldCheck />}
                  title="Administrator access required"
                />
              ) : (
                <>
                  <div className="stats-grid three">
                    {[
                      [
                        "Open reviews",
                        data.disputes.filter((d) => d.status === "open").length,
                      ],
                      ["Projects", data.projects.length],
                      [
                        "Test transfers",
                        data.payments.filter((p) => p.status === "transferred")
                          .length,
                      ],
                    ].map(([t, v]) => (
                      <div className="stat" key={t}>
                        <span>{t}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  {data.disputes.map((d) => (
                    <section className="panel review" key={d.id}>
                      <div className="section-heading">
                        <h2>
                          {
                            data.projects.find((p) => p.id === d.project_id)
                              ?.title
                          }
                        </h2>
                        <span className="tag">{d.status}</span>
                      </div>
                      <p className="preserve">{d.reason}</p>
                      <small>
                        Opened by {name(d.opened_by)} · {human(d.created_at)}
                      </small>
                      {d.resolution && (
                        <div className="notice">Resolution: {d.resolution}</div>
                      )}
                      <div className="actions">
                        <Button
                          secondary
                          onClick={() => go("workspace/" + d.project_id)}
                        >
                          Inspect workspace
                        </Button>
                        {d.status === "open" && (
                          <Button onClick={() => open("review", d.project_id)}>
                            Review & resolve
                            <ArrowRight size={16} />
                          </Button>
                        )}
                      </div>
                    </section>
                  ))}
                  {!data.disputes.length && (
                    <Empty
                      icon={<ShieldCheck />}
                      title="All clear for now."
                      text="Reported project issues will appear here."
                    />
                  )}
                  <h2 className="lower">Payment ledger</h2>
                  <section className="panel">
                    {data.payments.map((p) => (
                      <div className="dashboard-row" key={p.project_id}>
                        <span className="row-title">
                          <strong>
                            {
                              data.projects.find((x) => x.id === p.project_id)
                                ?.title
                            }
                          </strong>
                          <small>
                            {p.status} · CAD ·{" "}
                            {demo ? "simulated" : "Stripe test"}
                          </small>
                        </span>
                        <strong>{money(p.amount)}</strong>
                      </div>
                    ))}
                    {!data.payments.length && <Empty text="No payments yet." />}
                  </section>
                </>
              )}
            </>
          ) : (
            <Empty
              icon={<Search />}
              title={
                page === "profile" && !user
                  ? "Sign in to see your profile"
                  : "We couldn’t find that page."
              }
            >
              <Button onClick={() => go("home")}>Back to discover</Button>
            </Empty>
          )}
          <footer className="footer">
            <a href="#home">forge.</a>
            <span>A place for ideas to become useful things.</span>
            <div>
              <button onClick={() => open("terms")}>Community & terms</button>
              <span>© {new Date().getFullYear()} Forge</span>
            </div>
          </footer>
        </main>
      </div>
      {m.toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {m.toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            (
              {
                auth: "Welcome to Forge",
                bid: "Make your proposal",
                select: "Choose your developer",
                approve: "Ready to call it done?",
                revise: "What needs another pass?",
                dispute: "Let’s take a closer look",
                review: "Review & resolve",
                profile: "Make yourself at home",
                reset: "Start the demo over?",
                help: "Take Forge for a spin",
                terms: "A good place to build",
              } as Record<string, string>
            )[modal]
          }
          onClose={() => setModal("")}
        >
          {modal === "auth" ? (
            <form
              onSubmit={(e) =>
                submit(e, async (f) => {
                  await m.auth(
                    String(f.get("email")),
                    String(f.get("password")),
                    String(f.get("name")),
                    f.get("signup") === "on",
                  );
                  setModal("");
                })
              }
            >
              <p>One account for commissioning and building.</p>
              <Field label="Name (for a new account)">
                <input
                  name="name"
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="current-password"
                />
              </Field>
              <label className="inline-check">
                <input name="signup" type="checkbox" />
                Create a new account
              </label>
              <ErrorText text={error} />
              <Button type="submit" disabled={busy}>
                Continue
                <ArrowRight size={16} />
              </Button>
            </form>
          ) : modal === "bid" ? (
            <form
              onSubmit={(e) =>
                submit(e, async (f) => {
                  await m.act("bid", {
                    project_id: selected,
                    amount: f.get("amount"),
                    days: f.get("days"),
                    proposal: f.get("proposal"),
                  });
                  setModal("");
                  m.notify("Proposal submitted");
                })
              }
            >
              <p>
                Show how you’d approach the project. A thoughtful plan goes a
                long way.
              </p>
              <div className="form-two">
                <Field label="Your price (CAD)">
                  <input
                    name="amount"
                    type="number"
                    min={25}
                    max={10000}
                    required
                    placeholder="250"
                  />
                </Field>
                <Field label="Delivery time (days)">
                  <input
                    name="days"
                    type="number"
                    min={1}
                    max={60}
                    required
                    placeholder="5"
                  />
                </Field>
              </div>
              <Field
                label="Your proposal"
                hint="Include approach, scope, and handover."
              >
                <textarea
                  name="proposal"
                  rows={5}
                  minLength={30}
                  maxLength={4000}
                  required
                  placeholder="Here’s how I’d bring this to life..."
                />
              </Field>
              <ErrorText text={error} />
              <Button type="submit" disabled={busy}>
                Send proposal
                <Send size={16} />
              </Button>
            </form>
          ) : modal === "profile" ? (
            <form
              onSubmit={(e) =>
                submit(e, async (f) => {
                  await m.act("profile", {
                    name: f.get("name"),
                    bio: f.get("bio"),
                    skills: String(f.get("skills"))
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  setModal("");
                  m.notify("Profile updated");
                })
              }
            >
              <Field label="Name">
                <input
                  name="name"
                  defaultValue={me?.name}
                  minLength={2}
                  maxLength={60}
                  required
                />
              </Field>
              <Field label="A little about you">
                <textarea
                  name="bio"
                  defaultValue={me?.bio}
                  rows={4}
                  maxLength={1000}
                />
              </Field>
              <Field label="Your skills" hint="Up to 8, separated by commas">
                <input name="skills" defaultValue={me?.skills.join(", ")} />
              </Field>
              <ErrorText text={error} />
              <Button disabled={busy} type="submit">
                Save profile
                <Check size={16} />
              </Button>
            </form>
          ) : modal === "select" ? (
            <>
              <p>
                You’re choosing{" "}
                <strong>
                  {name(
                    data.bids.find((b) => b.id === selected)?.developer_id ||
                      null,
                  )}
                </strong>{" "}
                for{" "}
                <strong>
                  {money(data.bids.find((b) => b.id === selected)?.amount || 0)}{" "}
                  CAD
                </strong>
                . This locks the selected proposal and creates a private
                workspace.
              </p>
              <p>
                Fund the agreed amount before development begins.{" "}
                {demo
                  ? "Funding is simulated in this demo."
                  : "This beta accepts Stripe test payments only."}
              </p>
              <ErrorText text={error} />
              <Button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const id = await m.act("accept", { bid_id: selected });
                    setModal("");
                    go("workspace/" + id);
                  }, "Developer selected")
                }
              >
                Confirm selection
                <ArrowRight size={16} />
              </Button>
            </>
          ) : modal === "approve" ? (
            <>
              <p>
                Confirm you reviewed the files and the delivery meets the agreed
                brief. Approval initiates the developer transfer.
              </p>
              <p>
                {demo
                  ? "This transfer is simulated. No money moves."
                  : "The transfer goes to the developer’s Stripe account. Bank payout timing is separate."}
              </p>
              <ErrorText text={error} />
              <Button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await m.act("workspace", {
                      project_id: selected,
                      action: "approve",
                    });
                    setModal("");
                  }, "Delivery approved")
                }
              >
                Approve &{" "}
                {demo ? "simulate transfer" : "initiate test transfer"}
                <Check size={16} />
              </Button>
            </>
          ) : ["revise", "dispute"].includes(modal) ? (
            <form
              onSubmit={(e) =>
                submit(e, async (f) => {
                  await m.act("workspace", {
                    project_id: selected,
                    action: modal,
                    detail: f.get("detail"),
                  });
                  setModal("");
                  m.notify("Project updated");
                })
              }
            >
              <p>
                {modal === "revise"
                  ? "Explain the changes you need. Feedback will be added to project messages."
                  : "Explain what happened and the resolution you want. An administrator will review the issue. Transfer is paused."}
              </p>
              <Field
                label={
                  modal === "revise" ? "Revision details" : "Issue details"
                }
              >
                <textarea
                  name="detail"
                  rows={5}
                  minLength={10}
                  maxLength={4000}
                  required
                />
              </Field>
              <ErrorText text={error} />
              <Button type="submit" disabled={busy}>
                {modal === "revise"
                  ? "Send revision request"
                  : "Submit for review"}
                <ArrowRight size={16} />
              </Button>
            </form>
          ) : modal === "review" ? (
            <form
              onSubmit={(e) =>
                submit(e, async (f) => {
                  await m.act("review", {
                    project_id: selected,
                    decision: f.get("decision"),
                    note: f.get("note"),
                  });
                  setModal("");
                  m.notify("Review decision recorded");
                })
              }
            >
              <Field label="Resolution">
                <select name="decision">
                  <option value="resume">Resume work and revisions</option>
                  <option value="approve">
                    Accept delivery and initiate test transfer
                  </option>
                  <option value="refund">Refund customer in test mode</option>
                </select>
              </Field>
              <Field label="Review notes">
                <textarea
                  name="note"
                  rows={5}
                  minLength={10}
                  maxLength={4000}
                  required
                  placeholder="Record evidence and the reason for your decision."
                />
              </Field>
              <ErrorText text={error} />
              <Button disabled={busy} type="submit">
                Record resolution
                <Check size={16} />
              </Button>
            </form>
          ) : modal === "reset" ? (
            <>
              <p>
                This replaces demo projects, proposals, and messages in this
                browser with the original sample data.
              </p>
              <Button
                onClick={() => {
                  m.reset();
                  setModal("");
                  go("home");
                }}
              >
                Reset demo
                <RefreshCw size={16} />
              </Button>
            </>
          ) : modal === "help" ? (
            <>
              <p>Try a complete commission in a few minutes:</p>
              <ol>
                <li>
                  As <strong>Aayan · Customer</strong>, open the CSV cleaner
                  request from your dashboard.
                </li>
                <li>Select Maya’s proposal and simulate funding.</li>
                <li>
                  Switch to <strong>Maya · Developer</strong> in the top bar.
                  Upload a file and submit for review.
                </li>
                <li>
                  Switch back to Aayan. Review files, request revisions, or
                  approve delivery.
                </li>
                <li>
                  For disputes, report an issue before approval and switch to{" "}
                  <strong>Admin · Reviewer</strong>.
                </li>
              </ol>
              <div className="notice">
                Demo identities and payments are simulated. The connected
                version uses Supabase authentication and Stripe test mode.
              </div>
              <Button
                onClick={() => {
                  setModal("");
                  go("dashboard");
                }}
              >
                Open my dashboard
                <ArrowRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <p>
                Commission only software you have rights to request. Agree on
                scope, supported versions, acceptance criteria, source delivery,
                and licensing before work begins.
              </p>
              <p>
                Do not request cheating tools, unauthorized access, license
                circumvention, or redistribution of proprietary code or assets
                without permission.
              </p>
              <p>
                Keep secrets and personal information out of public briefs.
                Uploaded code is never executed by Forge. Review downloads
                before opening them.
              </p>
              <p>
                Payment protection in this beta is a test workflow, not legal
                escrow. Live payments and public launch remain disabled pending
                provider and legal review.
              </p>
              <p>
                These beta community guidelines do not replace final privacy,
                customer, developer, and IP agreements.
              </p>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {children}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
  children,
}: {
  icon?: ReactNode;
  title?: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon}
      {title && <h3>{title}</h3>}
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
function ErrorText({ text }: { text: string }) {
  return text ? (
    <p className="form-error" role="alert">
      {text}
    </p>
  ) : null;
}
