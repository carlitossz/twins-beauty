-- =====================================================================
-- TWINS BEAUTY · Esquema de base de datos (Supabase / PostgreSQL)
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr de nuevo sin romper nada.
-- Después, correr seed.sql una sola vez para cargar el catálogo inicial.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Administradores ----------
-- Solo los correos de esta tabla pueden entrar al panel y modificar datos.
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Ajustes de la tienda (una sola fila) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Twins Beauty',
  whatsapp text not null default '',            -- solo dígitos con código de país, ej. 584141234567
  bs_rate numeric(14,2),                         -- bolívares por 1 USD (vacío = se cobra "$ en Bs")
  cop_rate numeric(14,2),                        -- pesos por 1 USD (vacío = no se ofrece total en pesos)
  wholesale_min int not null default 6 check (wholesale_min >= 0),  -- productos para precio al mayor (0 = sin precio al mayor)
  pickup_info text not null default '',
  delivery_info text not null default '',
  shipping_info text not null default '',
  agencies jsonb not null default '[]'::jsonb,   -- agencias de envío nacional, ej. ["MRW","Zoom"]. Vacío = el cliente la escribe
  payment_methods jsonb not null default '[]'::jsonb,
  reserve_hours int not null default 24 check (reserve_hours >= 0),  -- horas que un pedido sin pagar aparta el stock (0 = no se libera solo)
  updated_at timestamptz not null default now()
);

insert into public.settings (id, payment_methods, pickup_info, delivery_info, shipping_info)
values (1,
  '[{"name":"Pago móvil","currency":"BS","note":"A la tasa del día.","fields":[{"label":"Banco","value":"","copyable":false},{"label":"Teléfono","value":"","copyable":true},{"label":"Cédula","value":"","copyable":true}],"enabled":true,"cash":false},
    {"name":"Efectivo $","currency":"USD","note":"Pagas en dólares al recibir.","fields":[],"enabled":true,"cash":true},
    {"name":"Zelle","currency":"USD","note":"","fields":[{"label":"Correo","value":"","copyable":true},{"label":"Titular","value":"","copyable":false}],"enabled":false,"cash":false},
    {"name":"Binance","currency":"USD","note":"","fields":[{"label":"ID Binance Pay","value":"","copyable":true}],"enabled":false,"cash":false}]'::jsonb,
  'Acordamos el punto de entrega por WhatsApp.',
  'Te lo llevamos a tu casa. El costo depende de la zona; te lo confirmamos por WhatsApp.',
  'Enviamos a todo el país por agencia. El envío lo pagas al recibir.')
on conflict (id) do nothing;

-- ---------- Productos ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- nombre corto en español, ej. "Polvo Halo Glow"
  subtitle text not null default '',               -- nombre oficial / presentación, ej. "Halo Glow Powder Filter · 10 g"
  brand text not null default 'e.l.f.',
  category text not null default 'Rostro',         -- Labios, Rostro, Ojos y cejas, Brochas, Skincare…
  badge text not null default '',                  -- ej. Nuevo, Favorito
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),                 -- precio al detal en dólares
  price_wholesale numeric(10,2) check (price_wholesale >= 0),     -- precio al mayor; vacío = solo se vende al detal
  image_url text,                                  -- foto principal; se mantiene igual a la primera de "images"
  images jsonb not null default '[]'::jsonb,       -- hasta 3 fotos del producto
  swatch_url text,                                 -- foto opcional con la carta de tonos
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- Tonos (o una sola fila con name = '' si el producto no tiene tonos). Cada uno con su stock.
create table if not exists public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default '',       -- nombre del tono. '' = producto sin tonos
  hex text not null default '',        -- color del circulito, ej. #E2BC9A
  image_url text,                      -- foto opcional de ese tono
  grp text not null default '',        -- grupo opcional para ordenar, ej. "Con brillo"
  sort int not null default 0,
  stock int not null default 0 check (stock >= 0),
  unique (product_id, name)
);

-- ---------- Pedidos ----------
create sequence if not exists public.order_code_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,   -- TB-0001, TB-0002… se asigna solo cuando el pedido se completa
  customer_name text not null,
  customer_phone text not null,
  id_number text not null default '',          -- cédula (envíos nacionales)
  delivery text not null check (delivery in ('pickup', 'delivery', 'envio')),
  address text not null default '',
  state text not null default '',
  city text not null default '',
  agency text not null default '',
  payment_method text not null,
  currency text not null check (currency in ('USD', 'COP', 'BS')),
  total_usd numeric(10,2) not null,
  retail_usd numeric(10,2) not null default 0,  -- lo que habría costado al detal (para mostrar el ahorro)
  total_bs numeric(14,2),
  total_cop numeric(14,0),
  wholesale boolean not null default false,     -- se cobró con precio al mayor
  cash_amount numeric(14,2),  -- con cuánto dijo el cliente que paga (solo efectivo); null = paga exacto o no aplica
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'entregado', 'cancelado')),
  channel text not null default 'tienda' check (channel in ('tienda', 'externa')),  -- 'externa' = venta registrada a mano por el admin
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.variants(id) on delete set null,
  product_name text not null,
  tone text not null default '',       -- tono pedido, copiado al momento de la compra ('' = sin tono)
  qty int not null check (qty > 0),
  unit_usd numeric(10,2) not null,
  wholesale boolean not null default false
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists variants_product_idx on public.variants (product_id);

-- ---------- Seguridad (RLS) ----------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins se ven a si mismos" on public.admins;
create policy "admins se ven a si mismos" on public.admins for select using (public.is_admin());

drop policy if exists "todos leen ajustes" on public.settings;
create policy "todos leen ajustes" on public.settings for select using (true);
drop policy if exists "admin edita ajustes" on public.settings;
create policy "admin edita ajustes" on public.settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "todos leen productos activos" on public.products;
create policy "todos leen productos activos" on public.products for select using (active or public.is_admin());
drop policy if exists "admin gestiona productos" on public.products;
create policy "admin gestiona productos" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "todos leen tonos" on public.variants;
create policy "todos leen tonos" on public.variants for select using (true);
drop policy if exists "admin gestiona tonos" on public.variants;
create policy "admin gestiona tonos" on public.variants for all using (public.is_admin()) with check (public.is_admin());

-- Los clientes NO leen ni escriben pedidos directo: solo a través de create_order()
drop policy if exists "admin gestiona pedidos" on public.orders;
create policy "admin gestiona pedidos" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin gestiona items" on public.order_items;
create policy "admin gestiona items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Liberar pedidos no pagados ----------
-- Cancela los pedidos "pendiente" con más de reserve_hours horas y devuelve sus productos al stock.
create or replace function public.release_expired_orders()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_hours int;
  v_count int := 0;
  r record;
begin
  select reserve_hours into v_hours from public.settings where id = 1;
  if v_hours is null or v_hours <= 0 then
    return 0;
  end if;

  for r in
    select id from public.orders
    where status = 'pendiente' and created_at < now() - make_interval(hours => v_hours)
    for update skip locked
  loop
    update public.variants v set stock = v.stock + i.qty
    from public.order_items i
    where i.order_id = r.id and i.variant_id = v.id;

    update public.orders
    set status = 'cancelado',
        notes = trim(both ' ' from notes || ' Liberado automáticamente: no se confirmó el pago en ' || v_hours || ' h.')
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.release_expired_orders() from public;
grant execute on function public.release_expired_orders() to anon, authenticated;

-- ---------- Guardar los productos de un pedido (uso interno) ----------
-- Valida y descuenta stock, decide si aplica el precio al mayor y devuelve los totales en dólares.
-- p_force_wholesale: null = se decide solo por la cantidad; true/false = lo decide el admin (ventas externas).
create or replace function public._fill_order_items(p_order_id uuid, p_items jsonb, p_max_qty int, p_force_wholesale boolean)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_min int;
  v_units int := 0;
  v_wholesale boolean;
  v_total numeric := 0;
  v_retail numeric := 0;
  v_item jsonb;
  v_qty int;
  v_unit numeric;
  r record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if jsonb_array_length(p_items) > 60 then
    raise exception 'Demasiados productos en un pedido';
  end if;

  -- 1) Validar y contar cuántos productos con precio al mayor lleva el pedido
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > p_max_qty then
      raise exception 'Cantidad no válida';
    end if;
    select p.price_wholesale into r
    from public.variants v join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid;
    if not found then
      raise exception 'Uno de los productos ya no existe';
    end if;
    if r.price_wholesale is not null then
      v_units := v_units + v_qty;
    end if;
  end loop;

  select wholesale_min into v_min from public.settings where id = 1;
  v_wholesale := coalesce(p_force_wholesale, coalesce(v_min, 0) > 0 and v_units >= v_min);

  -- 2) Descontar stock y guardar cada línea
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'qty')::int;

    select v.id as variant_id, v.name as tone, v.stock, p.id as product_id, p.name, p.price, p.price_wholesale, p.active
    into r
    from public.variants v join public.products p on p.id = v.product_id
    where v.id = (v_item ->> 'variant_id')::uuid
    for update of v;

    if p_force_wholesale is null and not r.active then
      raise exception 'Uno de los productos ya no está disponible';
    end if;
    if r.stock < v_qty then
      raise exception 'Ya no queda stock de %', r.name || case when r.tone <> '' then ' (' || r.tone || ')' else '' end;
    end if;

    update public.variants set stock = stock - v_qty where id = r.variant_id;

    v_unit := case when v_wholesale and r.price_wholesale is not null then r.price_wholesale else r.price end;

    insert into public.order_items (order_id, product_id, variant_id, product_name, tone, qty, unit_usd, wholesale)
    values (p_order_id, r.product_id, r.variant_id, r.name, r.tone, v_qty, v_unit, v_wholesale and r.price_wholesale is not null);

    v_total := v_total + v_unit * v_qty;
    v_retail := v_retail + r.price * v_qty;
  end loop;

  return jsonb_build_object('total', v_total, 'retail', v_retail, 'wholesale', v_wholesale and v_retail <> v_total);
end;
$$;

revoke all on function public._fill_order_items(uuid, jsonb, int, boolean) from public, anon, authenticated;

-- ---------- Crear pedido (lo usa el cliente) ----------
-- Valida stock, lo descuenta (queda apartado) y guarda el pedido, todo en una sola transacción.
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery text,
  p_address text,
  p_payment_method text,
  p_items jsonb,
  p_cash_amount numeric default null,
  p_id_number text default '',
  p_state text default '',
  p_city text default '',
  p_agency text default ''
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_currency text;
  v_bs_rate numeric;
  v_cop_rate numeric;
  v_is_cash boolean;
  v_order_id uuid;
  v_code text;
  v_sum jsonb;
  v_total numeric;
  v_total_bs numeric;
  v_total_cop numeric;
  v_total_selected numeric;
begin
  if coalesce(trim(p_customer_name), '') = '' or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'Escribe tu nombre y tu WhatsApp';
  end if;
  if p_delivery not in ('pickup', 'delivery', 'envio') then
    raise exception 'Elige cómo recibes tu pedido';
  end if;
  if p_delivery = 'delivery' and coalesce(trim(p_address), '') = '' then
    raise exception 'Escribe la dirección de entrega';
  end if;
  if p_delivery = 'envio' and (coalesce(trim(p_id_number), '') = '' or coalesce(trim(p_state), '') = '' or coalesce(trim(p_city), '') = '' or coalesce(trim(p_agency), '') = '') then
    raise exception 'Para el envío necesitamos cédula, estado, ciudad y agencia';
  end if;

  -- Antes de revisar stock, se liberan los apartados vencidos
  perform public.release_expired_orders();

  select pm ->> 'currency', s.bs_rate, s.cop_rate, coalesce((pm ->> 'cash')::boolean, false)
  into v_currency, v_bs_rate, v_cop_rate, v_is_cash
  from public.settings s, jsonb_array_elements(s.payment_methods) pm
  where s.id = 1 and pm ->> 'name' = p_payment_method and coalesce((pm ->> 'enabled')::boolean, true)
  limit 1;
  if v_currency is null then
    raise exception 'Ese método de pago no está disponible';
  end if;
  if p_cash_amount is not null and not v_is_cash then
    raise exception 'Ese método de pago no es en efectivo';
  end if;
  if p_cash_amount is not null and p_cash_amount < 0 then
    raise exception 'Monto no válido';
  end if;

  v_order_id := gen_random_uuid();
  insert into public.orders (id, code, customer_name, customer_phone, id_number, delivery, address, state, city, agency, payment_method, currency, total_usd, cash_amount)
  values (v_order_id, v_order_id::text, left(trim(p_customer_name), 80), left(trim(p_customer_phone), 30), left(coalesce(trim(p_id_number), ''), 20), p_delivery,
          left(coalesce(trim(p_address), ''), 240), left(coalesce(trim(p_state), ''), 60), left(coalesce(trim(p_city), ''), 60), left(coalesce(trim(p_agency), ''), 120),
          p_payment_method, v_currency, 0, p_cash_amount);

  v_sum := public._fill_order_items(v_order_id, p_items, 50, null);
  v_total := (v_sum ->> 'total')::numeric;

  if v_bs_rate is not null then v_total_bs := round(v_total * v_bs_rate, 2); end if;
  if v_cop_rate is not null then v_total_cop := round(v_total * v_cop_rate, 0); end if;

  v_total_selected := case v_currency when 'COP' then coalesce(v_total_cop, v_total) when 'BS' then coalesce(v_total_bs, v_total) else v_total end;
  if p_cash_amount is not null and p_cash_amount < v_total_selected then
    raise exception 'Ese monto no alcanza para cubrir el total';
  end if;

  -- El número se toma al final: si algo falla antes, no se pierde ningún número
  v_code := 'TB-' || lpad(nextval('public.order_code_seq')::text, 4, '0');

  update public.orders set code = v_code, total_usd = v_total, retail_usd = (v_sum ->> 'retail')::numeric,
         wholesale = (v_sum ->> 'wholesale')::boolean, total_bs = v_total_bs, total_cop = v_total_cop
  where id = v_order_id;

  return jsonb_build_object('code', v_code, 'total_usd', v_total, 'retail_usd', (v_sum ->> 'retail')::numeric,
                            'wholesale', (v_sum ->> 'wholesale')::boolean, 'total_bs', v_total_bs, 'total_cop', v_total_cop, 'currency', v_currency);
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, numeric, text, text, text, text) from public;
grant execute on function public.create_order(text, text, text, text, text, jsonb, numeric, text, text, text, text) to anon, authenticated;

-- ---------- Registrar una venta externa (lo usa el admin) ----------
-- Para ventas que pasaron fuera de la app (en persona, por Instagram, etc.): descuenta el mismo stock
-- y queda guardada como un pedido más (channel = 'externa'), ya pagado, para que salga en Reportes.
create or replace function public.create_external_sale(
  p_customer_name text,
  p_currency text,
  p_payment_method text,
  p_items jsonb,
  p_notes text default '',
  p_wholesale boolean default false
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_order_id uuid;
  v_code text;
  v_sum jsonb;
  v_total numeric;
  v_total_bs numeric;
  v_total_cop numeric;
  v_bs_rate numeric;
  v_cop_rate numeric;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_currency not in ('USD', 'COP', 'BS') then
    raise exception 'Moneda no válida';
  end if;

  perform public.release_expired_orders();
  select bs_rate, cop_rate into v_bs_rate, v_cop_rate from public.settings where id = 1;

  v_order_id := gen_random_uuid();
  insert into public.orders (id, code, customer_name, customer_phone, delivery, payment_method, currency, total_usd, status, channel, notes)
  values (v_order_id, v_order_id::text, coalesce(nullif(trim(p_customer_name), ''), 'Venta externa'), '', 'pickup',
          coalesce(nullif(trim(p_payment_method), ''), 'Venta externa'), p_currency, 0, 'pagado', 'externa', left(coalesce(p_notes, ''), 500));

  v_sum := public._fill_order_items(v_order_id, p_items, 200, coalesce(p_wholesale, false));
  v_total := (v_sum ->> 'total')::numeric;
  if v_bs_rate is not null then v_total_bs := round(v_total * v_bs_rate, 2); end if;
  if v_cop_rate is not null then v_total_cop := round(v_total * v_cop_rate, 0); end if;

  v_code := 'TB-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
  update public.orders set code = v_code, total_usd = v_total, retail_usd = (v_sum ->> 'retail')::numeric,
         wholesale = (v_sum ->> 'wholesale')::boolean, total_bs = v_total_bs, total_cop = v_total_cop
  where id = v_order_id;

  return jsonb_build_object('code', v_code, 'total_usd', v_total, 'retail_usd', (v_sum ->> 'retail')::numeric,
                            'wholesale', (v_sum ->> 'wholesale')::boolean, 'total_bs', v_total_bs, 'total_cop', v_total_cop, 'currency', p_currency);
end;
$$;

revoke all on function public.create_external_sale(text, text, text, jsonb, text, boolean) from public;
grant execute on function public.create_external_sale(text, text, text, jsonb, text, boolean) to authenticated;

-- ---------- Cambiar estado de un pedido (lo usa el admin) ----------
-- Si se cancela, los productos vuelven al stock.
create or replace function public.set_order_status(p_order_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_old text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if p_status not in ('pendiente', 'pagado', 'entregado', 'cancelado') then
    raise exception 'Estado no válido';
  end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if v_old is null then
    raise exception 'Pedido no encontrado';
  end if;
  if v_old = 'cancelado' then
    raise exception 'Un pedido cancelado no se puede reabrir; crea uno nuevo';
  end if;

  if p_status = 'cancelado' then
    update public.variants v set stock = v.stock + i.qty
    from public.order_items i
    where i.order_id = p_order_id and i.variant_id = v.id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
end;
$$;

revoke all on function public.set_order_status(uuid, text) from public;
grant execute on function public.set_order_status(uuid, text) to authenticated;

-- ---------- Fotos (Storage) ----------
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;

drop policy if exists "admin sube fotos" on storage.objects;
create policy "admin sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admin cambia fotos" on storage.objects;
create policy "admin cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admin borra fotos" on storage.objects;
create policy "admin borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());
