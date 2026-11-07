-- =====================================================================
-- TWINS BEAUTY · Actualización 002: carga del inventario inicial (conteo de nov 2026)
-- Correr DESPUÉS de 001. Pegar en Supabase → SQL Editor → Run.
--
-- 1) Agrega lo que faltaba: tonos nuevos, tonos del Lip Oil Stick y la brocha Ultimate Blending.
-- 2) Precios: lápiz de cejas suelto a 3 $ (y se muestra en la tienda).
-- 3) Pone TODO el stock en 0 y carga exactamente el conteo. Lo que no está en el conteo queda en 0.
--    Ojo: si hay pedidos "Por confirmar" en la tienda, sus productos dejan de estar apartados.
--
-- Al final muestra una tabla con lo cargado; si algo del conteo no encontró su producto o tono,
-- sale en los avisos (Messages) para revisarlo.
-- =====================================================================

begin;

-- ---------- 1) Lo que faltaba ----------
create or replace function pg_temp.tono(p_producto text, p_tono text, p_hex text, p_grp text default '')
returns void language plpgsql as $$
declare pid uuid; n int;
begin
  select id into pid from public.products where name = p_producto limit 1;
  if pid is null then
    raise notice 'No existe el producto %', p_producto;
    return;
  end if;
  if not exists (select 1 from public.variants where product_id = pid and name = p_tono) then
    select coalesce(max(sort), -1) + 1 into n from public.variants where product_id = pid;
    insert into public.variants (product_id, name, hex, grp, sort, stock) values (pid, p_tono, p_hex, p_grp, n, 0);
  end if;
end $$;

-- Lip Oil Stick (labiales en barra de caja gris): pasa de "sin tonos" a tonos
delete from public.variants
where name = '' and product_id = (select id from public.products where name = 'Lip Oil Stick' limit 1);
select pg_temp.tono('Lip Oil Stick', 'Rose Latte', '#C98B85');
select pg_temp.tono('Lip Oil Stick', 'Caramelt', '#B4775A');
select pg_temp.tono('Lip Oil Stick', 'Truffle', '#7A4A3E');
select pg_temp.tono('Lip Oil Stick', 'Jam Packed', '#7A1E3A');
select pg_temp.tono('Lip Oil Stick', 'Mauve Mentality', '#A0626C');
select pg_temp.tono('Lip Oil Stick', 'Pink Me Energy', '#E2588A');
select pg_temp.tono('Lip Oil Stick', 'Cherry On Top', '#B2213A');
update public.products set description = 'Labial en barra con aceite, color y brillo.' where name = 'Lip Oil Stick' and description = '';

select pg_temp.tono('Lip balm Glow Reviver', 'Strawberry Shortcake', '#F07C7C');
select pg_temp.tono('Gloss Glow Reviver', 'Piggy Bank', '#F2A7B5', 'Clásicos');
select pg_temp.tono('Gloss Glow Reviver', 'Papayarazzi', '#F5875A', 'Clásicos');
select pg_temp.tono('Gloss Glow Reviver', 'Bubble Burst', '#F49AC1', 'Clásicos');
select pg_temp.tono('Corrector Camo tapa blanca', 'Medium Warm', '#D6A873', 'Medios');
select pg_temp.tono('Lápiz de cejas', 'Blond', '#A88B6A');

-- Lápiz de cejas suelto: 3 $ y visible
update public.products set price = 3, active = true where name = 'Lápiz de cejas';

-- Brocha Ultimate Blending (8 $, solo detal)
insert into public.products (name, subtitle, brand, category, description, price, price_wholesale, image_url, images, sort)
select 'Brocha Ultimate Blending', 'Ultimate Blending Brush', 'e.l.f.', 'Brochas',
       'Brocha densa y redondeada para difuminar base, polvo o rubor.', 8, null,
       '/productos/brocha-ultimate-blending.webp', '["/productos/brocha-ultimate-blending.webp"]'::jsonb,
       coalesce((select sort from public.products where name = 'Brocha para base' limit 1), 20)
where not exists (select 1 from public.products where name = 'Brocha Ultimate Blending');
insert into public.variants (product_id, name, stock)
select id, '', 0 from public.products p
where name = 'Brocha Ultimate Blending' and not exists (select 1 from public.variants v where v.product_id = p.id);

-- ---------- 2) El conteo ----------
create temp table conteo (producto text, tono text, qty int) on commit drop;
insert into conteo (producto, tono, qty) values
  -- Corrector Soft Glam (24)
  ('Corrector Soft Glam', '10 Fair Cool', 1),
  ('Corrector Soft Glam', '11 Fair Neutral', 3),
  ('Corrector Soft Glam', '13 Fair Neutral', 1),
  ('Corrector Soft Glam', '20 Light Cool', 1),
  ('Corrector Soft Glam', '21 Light Neutral', 2),
  ('Corrector Soft Glam', '22 Light Warm', 1),
  ('Corrector Soft Glam', '25 Light Neutral', 1),
  ('Corrector Soft Glam', '30 Medium Warm', 1),
  ('Corrector Soft Glam', '31 Medium Neutral', 7),
  ('Corrector Soft Glam', '40 Tan Warm', 1),
  ('Corrector Soft Glam', '42 Tan Neutral', 3),
  ('Corrector Soft Glam', '51 Deep Cool', 2),
  -- Polvo Halo Glow
  ('Polvo Halo Glow', 'Fair Warm', 3),
  ('Polvo Halo Glow', 'Light Neutral', 2),
  ('Polvo Halo Glow', 'Light Warm', 2),
  ('Polvo Halo Glow', 'Fair Cool Neutral', 1),
  -- Primers
  ('Primer Putty minimizador de poros', '', 1),
  ('Primer Putty matte', '', 2),
  -- Rubor Halo Glow
  ('Rubor líquido Halo Glow', 'Rosé You Slay', 3),
  ('Rubor líquido Halo Glow', 'You Go Cocoa', 2),
  ('Rubor líquido Halo Glow', 'Berry Radiant', 1),
  ('Rubor líquido Halo Glow', 'Candlelit', 2),
  ('Rubor líquido Halo Glow', 'Magic Hour', 1),
  -- Sueltos
  ('Delineador plumón negro', '', 1),
  ('Gel para cejas y pestañas', '', 2),
  -- Rubor Camo
  ('Rubor líquido Camo', 'Copper Etiquette', 1),
  ('Rubor líquido Camo', 'Cheeky Lychee', 1),
  ('Rubor líquido Camo', 'Suave Mauve', 1),
  ('Rubor líquido Camo', 'Pinky Promise', 1),
  ('Rubor líquido Camo', 'Coral Crush', 1),
  -- Corrector Camo tapa blanca
  ('Corrector Camo tapa blanca', 'Fair Rose', 1),
  ('Corrector Camo tapa blanca', 'Fair Warm', 1),
  ('Corrector Camo tapa blanca', 'Tan Sand', 3),
  ('Corrector Camo tapa blanca', 'Medium Beige', 2),
  ('Corrector Camo tapa blanca', 'Light Sand', 2),
  ('Corrector Camo tapa blanca', 'Medium Warm', 1),
  -- Corrector Camo tapa negra
  ('Corrector Camo tapa negra', 'Deep Olive', 1),
  ('Corrector Camo tapa negra', 'Medium Warm', 1),
  ('Corrector Camo tapa negra', 'Light Beige', 1),
  ('Corrector Camo tapa negra', 'Medium Sand', 1),
  ('Corrector Camo tapa negra', 'Tan Walnut', 1),
  -- Brochas
  ('Brocha para base', '', 2),
  ('Brocha Ultimate Blending', '', 1),
  ('Brocha para líquidos o polvos', '', 1),
  ('Set de brochas Full Face', '', 1),
  -- Cejas
  ('Set lápiz de cejas', 'Neutral Brown', 3),
  ('Lápiz de cejas', 'Blond', 2),
  ('Lápiz de cejas', 'Taupe', 1),
  -- Pestañas
  ('Máscara Big Mood', 'Negro', 1),
  ('Máscara Big Mood', 'Marrón', 2),
  ('Pestañina Lash XTNDR', 'Marrón intenso', 1),
  -- Lip balm
  ('Lip balm Glow Reviver', 'Strawberry Shortcake', 4),
  ('Lip balm Glow Reviver', 'Cotton Candy Crush', 1),
  ('Lip balm Glow Reviver', 'Vanilla Soft Serve', 2),
  ('Lip balm Glow Reviver', 'Wild Cherry', 1),
  ('Lip balm Glow Reviver', 'Vanilla Toffee', 1),
  -- Corrector de color
  ('Corrector de color Camo', 'Verde', 3),
  ('Corrector de color Camo', 'Durazno', 1),
  ('Corrector de color Camo', 'Naranja', 1),
  -- Tintas
  ('Tinta labios y mejillas', 'Cherry Cola', 2),
  ('Tinta labios y mejillas', 'Left On Red', 1),
  ('Tinta labios y mejillas', 'Pink Positive', 1),
  ('Tinta labios y mejillas', 'Plums Up', 3),
  -- Gloss lip oil
  ('Gloss Glow Reviver', 'Piggy Bank', 1),
  ('Gloss Glow Reviver', 'Papayarazzi', 1),
  ('Gloss Glow Reviver', 'Bubble Burst', 1),
  ('Gloss Glow Reviver', 'It''s Giving Guava', 1),
  ('Gloss Glow Reviver', 'Rose Envy', 3),
  ('Gloss Glow Reviver', 'Pink Quartz', 3),
  ('Gloss Glow Reviver', 'Crystal Clear', 3),
  ('Gloss Glow Reviver', 'Super-Neutral', 2),
  ('Gloss Glow Reviver', 'Money Mauve', 3),
  ('Gloss Glow Reviver', 'Honey Talks', 4),
  ('Gloss Glow Reviver', 'Crystal Baller', 3),
  ('Gloss Glow Reviver', 'Princess Cut', 5),
  ('Gloss Glow Reviver', 'Chocoluxe', 1),
  -- Labiales en barra caja gris (Lip Oil Stick)
  ('Lip Oil Stick', 'Rose Latte', 4),
  ('Lip Oil Stick', 'Caramelt', 9),
  ('Lip Oil Stick', 'Truffle', 1),
  ('Lip Oil Stick', 'Jam Packed', 1),
  ('Lip Oil Stick', 'Mauve Mentality', 3),
  ('Lip Oil Stick', 'Pink Me Energy', 10),
  ('Lip Oil Stick', 'Cherry On Top', 4),
  -- Paleta
  ('Paleta de sombras', 'Need It Nude', 2),
  ('Paleta de sombras', 'Everyday Smoky', 2),
  -- Skincare
  ('Crema hidratante Toleriane', '', 3);

-- ---------- 3) Todo en 0 y se carga el conteo ----------
update public.variants set stock = 0;

update public.variants v
set stock = c.qty
from public.products p, conteo c
where p.id = v.product_id and p.name = c.producto and v.name = c.tono;

do $$
declare r record; n int := 0;
begin
  for r in
    select c.* from conteo c
    where not exists (
      select 1 from public.variants v join public.products p on p.id = v.product_id
      where p.name = c.producto and v.name = c.tono)
  loop
    raise notice 'NO SE CARGÓ: % · % (% uds): no se encontró ese producto o tono', r.producto, nullif(r.tono, ''), r.qty;
    n := n + 1;
  end loop;
  if n = 0 then raise notice 'Todo el conteo se cargó bien.'; end if;
end $$;

-- Resumen: unidades por producto
select p.name as producto, sum(v.stock) as unidades
from public.products p join public.variants v on v.product_id = p.id
group by p.name, p.sort
order by p.sort, p.name;

commit;
