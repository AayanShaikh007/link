create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade,name text not null check(length(name) between 2 and 60),bio text not null default '' check(length(bio)<=1000),skills text[] not null default '{}' check(cardinality(skills)<=8),completed integer not null default 0,rating numeric);
create table public.admins(user_id uuid primary key references auth.users on delete cascade);
create table public.connected_accounts(user_id uuid primary key references auth.users on delete cascade,stripe_account_id text unique not null);
create table public.projects(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles,developer_id uuid references public.profiles,title text not null check(length(title) between 8 and 120),description text not null check(length(description) between 40 and 10000),category text not null check(category in ('Game mods','Plugins & extensions','Automation','Scripts & utilities','Business software')),budget integer not null check(budget between 25 and 10000),deadline date not null,skills text[] not null default '{}' check(cardinality(skills)<=8),status text not null default 'open' check(status in ('open','awaiting_payment','in_progress','delivered','approved','completed','disputed','refunded')),resale_eligible boolean not null default false,customer_distribution_consent boolean not null default false,developer_distribution_consent boolean not null default false,accepted_bid_id uuid,created_at timestamptz not null default now());
create table public.bids(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects on delete cascade,developer_id uuid not null references public.profiles,amount integer not null check(amount between 25 and 10000),days integer not null check(days between 1 and 60),proposal text not null check(length(proposal) between 30 and 4000),created_at timestamptz not null default now(),unique(project_id,developer_id));
alter table public.projects add constraint accepted_bid_fk foreign key(accepted_bid_id) references public.bids;
create table public.messages(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects,sender_id uuid not null references public.profiles,body text not null check(length(body) between 1 and 4000),created_at timestamptz not null default now());
create table public.assets(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects,uploader_id uuid not null references public.profiles,name text not null,path text unique not null,size integer not null check(size between 1 and 10485760),kind text not null check(kind in ('attachment','deliverable')),created_at timestamptz not null default now());
create table public.payments(project_id uuid primary key references public.projects,amount integer not null,status text not null default 'unpaid' check(status in ('unpaid','funded','transferred','refunded')),checkout_session_id text unique,charge_id text unique,transfer_id text unique,refund_id text unique,created_at timestamptz not null default now());
create table public.disputes(id uuid primary key default gen_random_uuid(),project_id uuid unique not null references public.projects,opened_by uuid not null references public.profiles,reason text not null check(length(reason) between 10 and 4000),status text not null default 'open' check(status in ('open','resolved')),resolution text,created_at timestamptz not null default now());
create table public.stripe_events(id text primary key,kind text not null,created_at timestamptz not null default now());
create table public.audit_log(id bigint generated always as identity primary key,actor_id uuid,project_id uuid,action text not null,created_at timestamptz not null default now());
create table public.payment_operations(project_id uuid primary key references public.projects,operation text not null check(operation in('transfer','refund')),created_at timestamptz not null default now());
create index on public.projects(category,status,created_at desc);create index on public.bids(project_id);create index on public.messages(project_id,created_at);create index on public.assets(project_id);
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from admins where user_id=auth.uid()) $$;
create function public.is_participant(pid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from projects where id=pid and auth.uid() in(owner_id,developer_id)) $$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into profiles(id,name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'New maker'),60)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();
create function public.accept_bid(bid_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare b bids; p projects;
begin select * into b from bids where id=bid_id; if not found then raise exception 'Bid not found'; end if;select * into p from projects where id=b.project_id for update;
if auth.uid() is distinct from p.owner_id or p.status<>'open' or b.developer_id=p.owner_id then raise exception 'Cannot accept this bid'; end if;
update projects set developer_id=b.developer_id,accepted_bid_id=b.id,status='awaiting_payment' where id=p.id;insert into payments(project_id,amount) values(p.id,b.amount);insert into audit_log(actor_id,project_id,action) values(auth.uid(),p.id,'bid.accepted');return p.id;end $$;
create function public.workspace_action(pid uuid,action text,detail text default '') returns void language plpgsql security definer set search_path=public as $$
declare p projects;
begin select * into p from projects where id=pid for update;
if not found or auth.uid() is null or (auth.uid() is distinct from p.owner_id and auth.uid() is distinct from p.developer_id) then raise exception 'Workspace access denied'; end if;
if action='deliver' and auth.uid()=p.developer_id and p.status='in_progress' then
if not exists(select 1 from assets where project_id=pid and kind='deliverable' and uploader_id=auth.uid()) then raise exception 'Upload a deliverable first'; end if;update projects set status='delivered' where id=pid;
elsif action='revise' and auth.uid()=p.owner_id and p.status='delivered' and length(trim(detail)) between 10 and 4000 then update projects set status='in_progress' where id=pid;insert into messages(project_id,sender_id,body) values(pid,auth.uid(),'Revision requested: '||detail);
elsif action='approve' and auth.uid()=p.owner_id and p.status='delivered' then update projects set status='approved' where id=pid;
elsif action='dispute' and p.status in('in_progress','delivered') and length(trim(detail)) between 10 and 4000 then insert into disputes(project_id,opened_by,reason) values(pid,auth.uid(),detail) on conflict(project_id) do update set status='open',reason=excluded.reason,opened_by=excluded.opened_by,resolution=null;update projects set status='disputed' where id=pid;
elsif action='consent' and p.resale_eligible then if auth.uid()=p.owner_id then update projects set customer_distribution_consent=(detail='yes') where id=pid;else update projects set developer_distribution_consent=(detail='yes') where id=pid;end if;
else raise exception 'Action not allowed in this project state';end if;
insert into audit_log(actor_id,project_id,action) values(auth.uid(),pid,'workspace.'||action);end $$;
create function public.resolve_dispute(pid uuid,decision text,note text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() or length(trim(note)) not between 10 and 4000 then raise exception 'Review permission or note missing';end if;
perform 1 from projects where id=pid and status='disputed' for update;if not found then raise exception 'No open review';end if;
if exists(select 1 from payment_operations where project_id=pid) then raise exception 'Financial action pending; retry that operation';end if;
if decision='resume' then update projects set status='in_progress' where id=pid;elsif decision='approve' then update projects set status='approved' where id=pid;else raise exception 'Unsupported resolution';end if;
update disputes set status='resolved',resolution=note where project_id=pid;insert into audit_log(actor_id,project_id,action) values(auth.uid(),pid,'review.'||decision);end $$;
create function public.record_funding(event_id text,pid uuid,session_id text,charge text,paid_amount integer) returns void language plpgsql security definer set search_path=public as $$
declare pay payments;
begin if exists(select 1 from stripe_events where id=event_id) then return;end if;select * into pay from payments where project_id=pid for update;
if not found or pay.checkout_session_id is distinct from session_id or pay.amount*100<>paid_amount then raise exception 'Payment reconciliation failed';end if;
insert into stripe_events(id,kind) values(event_id,'checkout.funded') on conflict do nothing;
if pay.status='unpaid' then update payments set status='funded',charge_id=charge where project_id=pid;update projects set status='in_progress' where id=pid and status='awaiting_payment';end if;end $$;
create function public.claim_payment_operation(pid uuid,op text) returns void language plpgsql security definer set search_path=public as $$
declare p projects;existing text;
begin select * into p from projects where id=pid for update;if not found or not((op='transfer' and p.status='approved') or (op='refund' and p.status='disputed')) then raise exception 'Financial action not allowed';end if;
select operation into existing from payment_operations where project_id=pid;if existing is not null and existing<>op then raise exception 'Another financial operation is pending';end if;
insert into payment_operations(project_id,operation) values(pid,op) on conflict do nothing;end $$;
create function public.record_transfer(pid uuid,tid text) returns void language plpgsql security definer set search_path=public as $$
begin perform 1 from projects where id=pid and status in('approved','completed') for update;if not found then raise exception 'Approval required';end if;
update payments set status='transferred',transfer_id=tid where project_id=pid and status in('funded','transferred');if not found then raise exception 'Funding required';end if;
update profiles set completed=completed+1 where id=(select developer_id from projects where id=pid and status='approved');update projects set status='completed' where id=pid;end $$;
create function public.record_refund(pid uuid,rid text,note text,actor uuid) returns void language plpgsql security definer set search_path=public as $$
begin perform 1 from projects where id=pid and status in('disputed','refunded') for update;if not found then raise exception 'Dispute review required';end if;
update payments set status='refunded',refund_id=rid where project_id=pid and status in('funded','refunded');if not found then raise exception 'Refund not permitted';end if;
update projects set status='refunded' where id=pid;update disputes set status='resolved',resolution=note where project_id=pid;insert into audit_log(actor_id,project_id,action) values(actor,pid,'review.refund');end $$;
revoke all on function public.accept_bid(uuid),public.workspace_action(uuid,text,text),public.resolve_dispute(uuid,text,text) from public,anon;
grant execute on function public.accept_bid(uuid),public.workspace_action(uuid,text,text),public.resolve_dispute(uuid,text,text) to authenticated;
revoke all on function public.record_funding(text,uuid,text,text,integer),public.claim_payment_operation(uuid,text),public.record_transfer(uuid,text),public.record_refund(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.record_funding(text,uuid,text,text,integer),public.claim_payment_operation(uuid,text),public.record_transfer(uuid,text),public.record_refund(uuid,text,text,uuid) to service_role;
