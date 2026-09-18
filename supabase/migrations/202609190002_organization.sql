-- Compatible upgrade for installations that applied 202609190001 before
-- custom categories, collection provenance, and primary membership existed.
alter function public.valid_library(jsonb) rename to valid_library_v1;

create function public.valid_library(s jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare i jsonb; c jsonb;
begin
 if not public.valid_library_v1(s) then return false; end if;
 if jsonb_typeof(coalesce(s->'customCategories','[]')) is distinct from 'array'
    or jsonb_array_length(coalesce(s->'customCategories','[]'))>50 then return false; end if;
 if exists(select 1 from jsonb_array_elements(coalesce(s->'customCategories','[]')) cat
   where jsonb_typeof(cat->'name') is distinct from 'string'
   or length(trim(cat->>'name')) not between 1 and 80
   or (cat->'description' is not null and jsonb_typeof(cat->'description') is distinct from 'string')
   or length(coalesce(cat->>'description',''))>500) then return false; end if;
 for c in select value from jsonb_array_elements(s->'collections') loop
  if (c->'description' is not null and jsonb_typeof(c->'description') is distinct from 'string')
    or (c->'criteria' is not null and jsonb_typeof(c->'criteria') is distinct from 'string')
    or length(coalesce(c->>'description',''))>500 or length(coalesce(c->>'criteria',''))>500
    or (c->>'origin' is not null and c->>'origin' not in ('automatic','custom','manual')) then return false; end if;
 end loop;
 for i in select value from jsonb_array_elements(s->'items') loop
  if i->>'primaryCollection' is not null
    and not (i->>'primaryCollection'=any(array(select jsonb_array_elements_text(i->'collections')))) then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;

alter table public.libraries drop constraint library_valid;
alter table public.libraries add constraint library_valid check(public.valid_library(state));

create or replace function public.patch_library(expected_revision bigint,patch jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
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
