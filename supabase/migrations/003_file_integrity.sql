-- A deliverable record must reference a file that actually exists in private storage.
drop policy assets_create on public.assets;
create policy assets_create on public.assets for insert to authenticated with check(
uploader_id=auth.uid() and path like project_id::text||'/'||auth.uid()::text||'/%'
and exists(select 1 from public.projects p where p.id=project_id and ((kind='attachment' and p.owner_id=auth.uid() and p.status='open') or (kind='deliverable' and p.developer_id=auth.uid() and p.status='in_progress')))
and exists(select 1 from storage.objects o where o.bucket_id='project-files' and o.name=path));
