-- SSEGAWA ESTATE COMPANY: Supabase database and security setup
-- Run the entire script in Supabase Dashboard > SQL Editor.
-- Then invite staff users in Authentication > Users and add their emails
-- to the staff_members table using the instructions in SETUP_GUIDE.md.

create extension if not exists pgcrypto;

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text not null,
  price_ugx bigint not null check (price_ugx > 0),
  plot_size text,
  road_distance text,
  description text,
  image_urls text[] not null default '{}',
  is_titled boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  email text,
  property_id uuid references public.properties(id) on delete set null,
  message text,
  status text not null default 'new' check (status in ('new','handled')),
  created_at timestamptz not null default now()
);

create index if not exists properties_published_created_idx on public.properties(is_published, created_at desc);
create index if not exists inquiries_created_idx on public.inquiries(created_at desc);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_members sm
    where sm.user_id = auth.uid() and sm.active = true
  );
$$;

alter table public.staff_members enable row level security;
alter table public.properties enable row level security;
alter table public.inquiries enable row level security;

-- Staff can read their own role record; only trusted SQL/dashboard operators
-- should add or deactivate staff_members. No public self-registration policy.
drop policy if exists "staff read own record" on public.staff_members;
create policy "staff read own record" on public.staff_members
for select to authenticated using (user_id = auth.uid());

drop policy if exists "public read published properties" on public.properties;
create policy "public read published properties" on public.properties
for select to anon, authenticated using (is_published = true or public.is_staff());

drop policy if exists "staff insert properties" on public.properties;
create policy "staff insert properties" on public.properties
for insert to authenticated with check (public.is_staff());

drop policy if exists "staff update properties" on public.properties;
create policy "staff update properties" on public.properties
for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff delete properties" on public.properties;
create policy "staff delete properties" on public.properties
for delete to authenticated using (public.is_staff());

drop policy if exists "public submit inquiry" on public.inquiries;
create policy "public submit inquiry" on public.inquiries
for insert to anon, authenticated
with check (
  char_length(customer_name) between 1 and 100
  and char_length(phone) between 5 and 30
  and (email is null or char_length(email) <= 150)
  and (message is null or char_length(message) <= 2000)
  and status = 'new'
);

drop policy if exists "staff read inquiries" on public.inquiries;
create policy "staff read inquiries" on public.inquiries
for select to authenticated using (public.is_staff());

drop policy if exists "staff update inquiries" on public.inquiries;
create policy "staff update inquiries" on public.inquiries
for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff delete inquiries" on public.inquiries;
create policy "staff delete inquiries" on public.inquiries
for delete to authenticated using (public.is_staff());

-- Create a public image bucket. Only authenticated active staff can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images','property-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "public view property images" on storage.objects;
create policy "public view property images" on storage.objects
for select to anon, authenticated using (bucket_id = 'property-images');

drop policy if exists "staff upload property images" on storage.objects;
create policy "staff upload property images" on storage.objects
for insert to authenticated with check (bucket_id = 'property-images' and public.is_staff());

drop policy if exists "staff update property images" on storage.objects;
create policy "staff update property images" on storage.objects
for update to authenticated using (bucket_id = 'property-images' and public.is_staff())
with check (bucket_id = 'property-images' and public.is_staff());

drop policy if exists "staff delete property images" on storage.objects;
create policy "staff delete property images" on storage.objects
for delete to authenticated using (bucket_id = 'property-images' and public.is_staff());

-- Optional starter listings. They are inserted as published so they appear
-- after the backend is connected. Edit them in the dashboard as needed.
insert into public.properties
(title, location, price_ugx, plot_size, road_distance, description, image_urls, is_titled, is_published)
select 'Wakiso Town Property', 'Wakiso Town, Wakiso', 50000000, '50 x 100 and beyond', null,
'Land opportunity in Wakiso Town. Contact us to confirm the exact plot size, availability and viewing arrangements.',
array[]::text[], true, true
where not exists (select 1 from public.properties where title = 'Wakiso Town Property' and location = 'Wakiso Town, Wakiso');

insert into public.properties
(title, location, price_ugx, plot_size, road_distance, description, image_urls, is_titled, is_published)
select 'Namayumba Residential Plots', 'Namayumba, Wakiso', 10000000, '50 x 100 and beyond', '3 km from the main Hoima Road',
'Land in Namayumba, approximately 3 km from the main Hoima Road. Arrange a free site inspection.',
array[]::text[], true, true
where not exists (select 1 from public.properties where title = 'Namayumba Residential Plots' and location = 'Namayumba, Wakiso');

insert into public.properties
(title, location, price_ugx, plot_size, road_distance, description, image_urls, is_titled, is_published)
select 'Gobero Residential Plots', 'Gobero, Wakiso', 20000000, '50 x 100 and beyond', '1 km from the main Hoima Road',
'Land in Gobero, approximately 1 km from the main Hoima Road. Arrange a free site inspection.',
array[]::text[], true, true
where not exists (select 1 from public.properties where title = 'Gobero Residential Plots' and location = 'Gobero, Wakiso');
