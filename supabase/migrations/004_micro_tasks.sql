-- Preserve existing commissions; require explicit completion criteria for newly posted work.
alter table public.projects add column acceptance_criteria text;
update public.projects set acceptance_criteria='Legacy request: confirm completion criteria in project messages before funding.';
alter table public.projects alter column acceptance_criteria set not null;
alter table public.projects add constraint projects_criteria_length check(length(trim(acceptance_criteria)) between 20 and 4000);
alter table public.projects drop constraint projects_budget_check;
alter table public.projects add constraint projects_budget_check check(budget between 15 and 10000);
alter table public.bids drop constraint bids_amount_check;
alter table public.bids add constraint bids_amount_check check(amount between 15 and 10000);
alter table public.projects drop constraint projects_category_check;
alter table public.projects add constraint projects_category_check check(category in ('Game mods','Plugins & extensions','Automation','Scripts & utilities','Business software','Smart home','AI workflows','Discord & bots','Tech troubleshooting'));
create or replace function public.workspace_action(pid uuid,action text,detail text default '') returns void language plpgsql security definer set search_path=public as $$
declare p projects;
begin select * into p from projects where id=pid for update;
if not found or auth.uid() is null or (auth.uid() is distinct from p.owner_id and auth.uid() is distinct from p.developer_id) then raise exception 'Workspace access denied'; end if;
if action='deliver' and auth.uid()=p.developer_id and p.status='in_progress' then
if not exists(select 1 from assets where project_id=pid and kind='deliverable' and uploader_id=auth.uid()) then raise exception 'Upload a deliverable first'; end if;update projects set status='delivered' where id=pid;
elsif action='revise' and auth.uid()=p.owner_id and p.status='delivered' and length(trim(detail)) between 10 and 4000 then update projects set status='in_progress' where id=pid;insert into messages(project_id,sender_id,body) values(pid,auth.uid(),'Revision requested: '||detail);
elsif action='approve' and auth.uid()=p.owner_id and p.status='delivered' and detail='acceptance-confirmed' then update projects set status='approved' where id=pid;
elsif action='dispute' and p.status in('in_progress','delivered') and length(trim(detail)) between 10 and 4000 then insert into disputes(project_id,opened_by,reason) values(pid,auth.uid(),detail) on conflict(project_id) do update set status='open',reason=excluded.reason,opened_by=excluded.opened_by,resolution=null;update projects set status='disputed' where id=pid;
elsif action='consent' and p.resale_eligible then if auth.uid()=p.owner_id then update projects set customer_distribution_consent=(detail='yes') where id=pid;else update projects set developer_distribution_consent=(detail='yes') where id=pid;end if;
else raise exception 'Action not allowed in this project state';end if;
insert into audit_log(actor_id,project_id,action) values(auth.uid(),pid,'workspace.'||action);end $$;
