-- $0 deployment: PostgreSQL is the authority for ownership, capacity, and revisions.
create table public.release_config (
 id boolean primary key default true check (id),
 accepting boolean not null default false,
 importing boolean not null default true,
 max_libraries integer not null default 10 check(max_libraries between 0 and 1000)
);
insert into public.release_config(id) values(true);
alter table public.release_config enable row level security;
-- No public policy. Only operators may update capacity through SQL.
create table public.libraries (
 owner uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null default '{"version":1,"items":[],"collections":[],"tombstones":[],"suppressed":[],"imports":[],"revision":0}',
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.libraries enable row level security;
create policy "own library only" on public.libraries for select to authenticated using(owner=auth.uid());
revoke all on public.libraries from anon, authenticated;
grant select on public.libraries to authenticated;
create function public.valid_library(s jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare i jsonb; c jsonb; ids text[]; cid text; p jsonb;
begin
 if s->>'version' is distinct from '1' or jsonb_typeof(s->'items') is distinct from 'array' or jsonb_typeof(s->'collections') is distinct from 'array' or jsonb_typeof(s->'tombstones') is distinct from 'array' or jsonb_typeof(s->'imports') is distinct from 'array' then return false; end if;
 if jsonb_array_length(s->'items')>5000 or jsonb_array_length(s->'collections')>500 or jsonb_array_length(s->'tombstones')>50000 or jsonb_array_length(s->'imports')>100 or octet_length((s->'items')::text)>15728640 then return false;end if;
 if jsonb_typeof(coalesce(s->'suppressed','[]'))is distinct from 'array' or jsonb_array_length(coalesce(s->'suppressed','[]'))>10000 then return false;end if;
 if jsonb_typeof(coalesce(s->'customCategories','[]'))is distinct from 'array' or jsonb_array_length(coalesce(s->'customCategories','[]'))>50 then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(s->'customCategories','[]')) cat where jsonb_typeof(cat->'name') is distinct from 'string' or length(trim(cat->>'name')) not between 1 and 80 or length(coalesce(cat->>'description',''))>500) then return false;end if;
 if octet_length(s::text)>20971520 then return false;end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(s->'items'))<>jsonb_array_length(s->'items') then return false;end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(s->'collections'))<>jsonb_array_length(s->'collections') then return false;end if;
 select coalesce(array_agg(value->>'id'),'{}') into ids from jsonb_array_elements(s->'collections');
 for c in select value from jsonb_array_elements(s->'collections') loop
  if length(coalesce(c->>'id',''))=0 or length(coalesce(c->>'name','')) not between 1 and 80 or jsonb_typeof(c->'manual') is distinct from 'boolean' or (c->>'style')::integer not between 0 and 3 then return false;end if;
  if length(coalesce(c->>'description',''))>500 or length(coalesce(c->>'criteria',''))>500 or (c->>'origin' is not null and c->>'origin' not in ('automatic','custom','manual')) then return false;end if;
  if c->>'parentId' is not null then
   select value into p from jsonb_array_elements(s->'collections') where value->>'id'=c->>'parentId';
   if p is null or p->>'parentId' is not null or c->>'id'=p->>'id' then return false;end if;
  end if;
 end loop;
 for i in select value from jsonb_array_elements(s->'items') loop
  if length(coalesce(i->>'id','')) not between 1 and 150 or coalesce(i->>'url','') !~ '^https://www\.instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+/$' or jsonb_typeof(i->'captions') is distinct from 'array' or jsonb_typeof(i->'hashtags') is distinct from 'array' or jsonb_typeof(i->'tags') is distinct from 'array' or jsonb_typeof(i->'collections') is distinct from 'array' or jsonb_typeof(i->'excluded') is distinct from 'array' or jsonb_typeof(i->'favorite') is distinct from 'boolean' or jsonb_typeof(i->'archived') is distinct from 'boolean' then return false;end if;
  if jsonb_typeof(i->'creator')is distinct from 'string' or jsonb_typeof(i->'fbid')is distinct from 'string' or jsonb_typeof(i->'note')is distinct from 'string' or jsonb_typeof(i->'importedAt')is distinct from 'number' or (jsonb_typeof(i->'timestamp')is distinct from 'number' and jsonb_typeof(i->'timestamp')is distinct from 'null') then return false;end if;
  if exists(select 1 from jsonb_array_elements(i->'captions')v where jsonb_typeof(v)is distinct from 'string') or exists(select 1 from jsonb_array_elements(i->'hashtags')v where jsonb_typeof(v)is distinct from 'string') or exists(select 1 from jsonb_array_elements(i->'tags')v where jsonb_typeof(v)is distinct from 'string' or length(v#>>'{}')>100) then return false;end if;
  if i->>'id'<>split_part(i->>'url','/',5) then return false;end if;
  if length(coalesce(i->>'note',''))>10000 or length(coalesce(i->>'creator',''))>500 or jsonb_array_length(i->'tags')>50 or jsonb_array_length(i->'captions')>10 or jsonb_array_length(i->'hashtags')>500 then return false;end if;
  if i->>'intent' is not null and i->>'intent' not in ('Learn','Try','Buy','Visit','Enjoy') then return false;end if;
  for cid in select jsonb_array_elements_text(i->'collections') loop if not(cid=any(ids))then return false;end if;end loop;
  if i->>'primaryCollection' is not null and not (i->>'primaryCollection'=any(array(select jsonb_array_elements_text(i->'collections')))) then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
alter table public.libraries add constraint library_valid check(public.valid_library(state));
create function public.open_library() returns jsonb language plpgsql security definer set search_path='' as $$
declare result public.libraries; cfg public.release_config;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into result from public.libraries where owner=auth.uid();
 if not found then
  select * into cfg from public.release_config where id=true for update;
  if not cfg.accepting then raise exception 'Online accounts are not open on this installation yet. Your device library remains available.';end if;
  if (select count(*) from public.libraries)>=cfg.max_libraries then raise exception 'Crate is full for now. You can still use a private library on this device.';end if;
  insert into public.libraries(owner)values(auth.uid())on conflict(owner)do nothing;
  select * into result from public.libraries where owner=auth.uid();
 end if;
 return jsonb_build_object('state',result.state,'revision',result.revision);
end $$;
create function public.patch_library(expected_revision bigint,patch jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare old public.libraries; next jsonb; merged jsonb; next_revision bigint; cfg public.release_config;
begin
 if auth.uid()is null then raise exception 'AUTH_REQUIRED';end if;
 select * into old from public.libraries where owner=auth.uid() for update;
 if not found then raise exception 'LIBRARY_NOT_ACTIVATED';end if;
 if old.revision<>expected_revision then raise exception 'REVISION_CONFLICT';end if;
 if jsonb_typeof(patch->'items')is distinct from 'array' or jsonb_typeof(patch->'remove')is distinct from 'array' then raise exception 'INVALID_PATCH';end if;
 select * into cfg from public.release_config where id=true;
 if not cfg.importing and exists(select 1 from jsonb_array_elements(patch->'items') incoming where not exists(select 1 from jsonb_array_elements(old.state->'items') existing where existing->>'id'=incoming->>'id')) then raise exception 'New imports are paused to keep Crate free. Your changes remain on this device.';end if;
 select coalesce(jsonb_agg(value order by value->>'id'),'[]') into merged from (
  select value from jsonb_array_elements(old.state->'items') existing where not exists(select 1 from jsonb_array_elements(patch->'items') incoming where incoming->>'id'=existing->>'id') and not exists(select 1 from jsonb_array_elements_text(patch->'remove') removed where removed=existing->>'id')
  union all select value from jsonb_array_elements(patch->'items')
 ) entries;
 next_revision=old.revision+1;
 next=jsonb_build_object('version',1,'items',merged,'collections',patch->'collections','tombstones',patch->'tombstones','suppressed',coalesce(patch->'suppressed','[]'),'imports',patch->'imports','customCategories',coalesce(patch->'customCategories',old.state->'customCategories','[]'),'revision',next_revision);
 if not public.valid_library(next)then raise exception 'INVALID_OR_OVER_QUOTA';end if;
 if patch->>'erase'='true' and jsonb_array_length(next->'items')=0 and jsonb_array_length(next->'collections')=0 then insert into public.deletion_ledger(owner,kind)values(auth.uid(),'library')on conflict(owner)do update set kind='library',deleted_at=now();end if;
 update public.libraries set state=next,revision=next_revision,updated_at=now()where owner=auth.uid();
 return next_revision;
end $$;
revoke all on function public.open_library() from public,anon;
revoke all on function public.patch_library(bigint,jsonb) from public,anon;
grant execute on function public.open_library() to authenticated;
grant execute on function public.patch_library(bigint,jsonb) to authenticated;
-- Keep deletion audit separate from library contents, private to the operator.
create table public.deletion_ledger(owner uuid primary key,deleted_at timestamptz not null default now(),kind text not null default 'account' check(kind in('account','library')));
alter table public.deletion_ledger enable row level security;
create function public.log_deleted_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.deletion_ledger(owner)values(old.id)on conflict(owner)do update set kind='account',deleted_at=now();return old;end $$;
create trigger user_deletion_log before delete on auth.users for each row execute function public.log_deleted_user();
