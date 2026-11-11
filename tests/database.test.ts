import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const c = "11111111-1111-4111-8111-111111111111",
  d = "22222222-2222-4222-8222-222222222222",
  o = "33333333-3333-4333-8333-333333333333",
  a = "44444444-4444-4444-8444-444444444444";
test("actual PostgreSQL migrations enforce RLS, file integrity, funding idempotency and financial locking", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;create function storage.extension(name text) returns text language sql as $$ select reverse(split_part(reverse(name),'.',1)) $$;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`,
    );
    for (const f of [
      "001_marketplace.sql",
      "002_authorization_storage.sql",
      "003_file_integrity.sql",
    ])
      await db.exec(
        (
          await readFile(
            new URL("../supabase/migrations/" + f, import.meta.url),
            "utf8",
          )
        ).replace("create extension if not exists pgcrypto;", ""),
      );
    await db.exec(
      `insert into auth.users(id,raw_user_meta_data) values('${c}','{"name":"Customer"}'),('${d}','{"name":"Developer"}'),('${o}','{"name":"Outsider"}'),('${a}','{"name":"Reviewer"}');insert into admins values('${a}');`,
    );
    const asUser = async (u: string, sql: string) => {
      await db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${u}',false);set role authenticated;`,
      );
      return db.query(sql);
    };
    let r = await asUser(
      c,
      `insert into projects(owner_id,title,description,category,budget,deadline) values('${c}','Local CSV processing tool','A useful local tool that previews and validates CSV files.','Scripts & utilities',200,current_date+30) returning id`,
    );
    const p = (r.rows[0] as any).id;
    await db.exec("reset role");
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/004_micro_tasks.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.match(
      (
        await db.query<{ acceptance_criteria: string }>(
          `select acceptance_criteria from projects where id='${p}'`,
        )
      ).rows[0].acceptance_criteria,
      /Legacy request/,
    );
    await assert.rejects(() =>
      asUser(
        c,
        `insert into projects(owner_id,title,description,category,budget,deadline) values('${c}','Missing completion criteria','A useful task description that is long enough.','Smart home',15,current_date+7)`,
      ),
    );
    for (const category of [
      "Smart home",
      "AI workflows",
      "Discord & bots",
      "Tech troubleshooting",
    ]) {
      await asUser(
        c,
        `insert into projects(owner_id,title,description,acceptance_criteria,category,budget,deadline) values('${c}','Small technical task','A useful task description that is long enough.','The configured routine passes the agreed sample test.','${category}',15,current_date+7)`,
      );
    }
    await assert.rejects(() =>
      asUser(
        c,
        `insert into projects(owner_id,title,description,acceptance_criteria,category,budget,deadline) values('${c}','Too small a budget','A useful task description that is long enough.','The routine passes the agreed sample test.','Smart home',14,current_date+7)`,
      ),
    );

    r = await asUser(
      d,
      `insert into bids(project_id,developer_id,amount,days,proposal) values('${p}','${d}',15,3,'I will deliver a useful local tool with tests and documentation.') returning id`,
    );
    const b = (r.rows[0] as any).id;
    await assert.rejects(() => asUser(d, `select accept_bid('${b}')`));
    await asUser(c, `select accept_bid('${b}')`);
    await assert.rejects(() =>
      asUser(c, `update projects set status='completed' where id='${p}'`),
    );
    await assert.rejects(() =>
      asUser(c, `update profiles set completed=999 where id='${c}'`),
    );
    await assert.rejects(() =>
      asUser(
        o,
        `insert into messages(project_id,sender_id,body) values('${p}','${o}','Unauthorized workspace note')`,
      ),
    );
    await asUser(
      d,
      `insert into messages(project_id,sender_id,body) values('${p}','${d}','Private project note')`,
    );
    assert.equal((await asUser(o, `select * from messages`)).rows.length, 0);
    assert.equal((await asUser(o, `select * from bids`)).rows.length, 0);
    await assert.rejects(() =>
      asUser(d, `select workspace_action('${p}','deliver','')`),
    );
    await assert.rejects(() =>
      asUser(
        c,
        `select record_funding('fake','${p}','cs_test','ch_test',1500)`,
      ),
    );
    await db.exec(
      `reset role;update payments set checkout_session_id='cs_test' where project_id='${p}';select record_funding('evt_1','${p}','cs_test','ch_test',1500);select record_funding('evt_1','${p}','cs_test','ch_test',1500);`,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from stripe_events",
        )
      ).rows[0].n,
      1,
    );
    await assert.rejects(() =>
      asUser(
        o,
        `insert into storage.objects(bucket_id,name) values('project-files','${p}/${o}/source.zip')`,
      ),
    );
    await assert.rejects(() =>
      asUser(
        d,
        `insert into assets(project_id,uploader_id,name,path,size,kind) values('${p}','${d}','phantom.zip','${p}/${d}/phantom.zip',100,'deliverable')`,
      ),
    );
    await asUser(
      d,
      `insert into storage.objects(bucket_id,name) values('project-files','${p}/${d}/source.zip')`,
    );
    await asUser(
      d,
      `insert into assets(project_id,uploader_id,name,path,size,kind) values('${p}','${d}','source.zip','${p}/${d}/source.zip',100,'deliverable')`,
    );
    assert.equal(
      (await asUser(o, `select * from storage.objects`)).rows.length,
      0,
    );
    await asUser(d, `select workspace_action('${p}','deliver','')`);
    await assert.rejects(() =>
      asUser(c, `select workspace_action('${p}','approve','')`),
    );
    await asUser(
      c,
      `select workspace_action('${p}','revise','Please add ISO date support')`,
    );
    await asUser(d, `select workspace_action('${p}','deliver','')`);
    await asUser(
      c,
      `select workspace_action('${p}','dispute','Agreed scope is incomplete and needs review')`,
    );
    await assert.rejects(() =>
      asUser(
        d,
        `select resolve_dispute('${p}','approve','I approve my own delivery')`,
      ),
    );
    await db.exec(
      `reset role;select claim_payment_operation('${p}','refund');`,
    );
    await assert.rejects(() =>
      asUser(
        a,
        `select resolve_dispute('${p}','approve','Trying to approve during refund')`,
      ),
    );
    await db.exec(
      `reset role;select record_refund('${p}','re_test','Scope reviewed and refunded','${a}');`,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          `select status from projects where id='${p}'`,
        )
      ).rows[0].status,
      "refunded",
    );
    // A separate successful $15 contract verifies the new approval acknowledgement
    // and that transfer retries do not increment completed work twice.
    r = await asUser(
      c,
      `insert into projects(owner_id,title,description,acceptance_criteria,category,budget,deadline) values('${c}','A small bot configuration','Configure a welcome bot in a test Discord server.','The test member receives one welcome message.','Discord & bots',15,current_date+7) returning id`,
    );
    const p2 = (r.rows[0] as any).id;
    r = await asUser(
      d,
      `insert into bids(project_id,developer_id,amount,days,proposal) values('${p2}','${d}',15,1,'I will configure and test a single welcome message.') returning id`,
    );
    await asUser(c, `select accept_bid('${(r.rows[0] as any).id}')`);
    await db.exec(
      `reset role;update payments set checkout_session_id='cs_two' where project_id='${p2}';select record_funding('evt_two','${p2}','cs_two','ch_two',1500)`,
    );
    await asUser(
      d,
      `insert into storage.objects(bucket_id,name) values('project-files','${p2}/${d}/handover.txt')`,
    );
    await asUser(
      d,
      `insert into assets(project_id,uploader_id,name,path,size,kind) values('${p2}','${d}','handover.txt','${p2}/${d}/handover.txt',100,'deliverable')`,
    );
    await asUser(d, `select workspace_action('${p2}','deliver','')`);
    await asUser(
      c,
      `select workspace_action('${p2}','approve','acceptance-confirmed')`,
    );
    await db.exec(
      `reset role;select claim_payment_operation('${p2}','transfer');select record_transfer('${p2}','tr_two');select record_transfer('${p2}','tr_two');`,
    );
    assert.equal(
      (
        await db.query<{ completed: number }>(
          `select completed from profiles where id='${d}'`,
        )
      ).rows[0].completed,
      1,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          `select status from projects where id='${p2}'`,
        )
      ).rows[0].status,
      "completed",
    );
  } finally {
    await db.close();
  }
});
