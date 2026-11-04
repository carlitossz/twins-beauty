-- =====================================================================
-- TWINS BEAUTY · Actualización 001 (nov 2026)
-- Para la base que YA está en línea (no hace falta si se carga seed.sql desde cero).
-- Pegar en Supabase → SQL Editor → Run. Se puede correr más de una vez sin duplicar nada.
--
--  · Set lápiz de cejas: el set solo viene en Neutral Brown (antes decía Taupe)
--  · Lápiz de cejas individual (Taupe y Deep Brown): entra OCULTO porque falta el precio
--  · Delineador plumón negro: 8 $ al detal
--  · Paleta de sombras: ahora con 2 tonos, Need It Nude y Everyday Smoky
--  · Brocha para base: nombre original Buffing Foundation Brush (la foto nueva llega con el deploy)
-- =====================================================================

do $$
declare
  pid uuid;
  v_sort int;
  v_old_stock int;
begin
  -- ---------- Set lápiz de cejas: Taupe → Neutral Brown ----------
  select id, sort into pid, v_sort from public.products where name = 'Set lápiz de cejas' limit 1;
  if pid is not null then
    update public.products
    set description = 'Set de 2 lápices retráctiles con cepillo. En set solo viene en Neutral Brown.',
        image_url = '/productos/lapiz-cejas.webp',
        images = '["/productos/lapiz-cejas.webp"]'::jsonb,
        swatch_url = '/tonos/lapiz-cejas.webp'
    where id = pid;

    if not exists (select 1 from public.variants where product_id = pid and name = 'Neutral Brown') then
      update public.variants set name = 'Neutral Brown', hex = '#5E4433' where product_id = pid and name = 'Taupe';
    end if;
    if not exists (select 1 from public.variants where product_id = pid and name = 'Neutral Brown') then
      insert into public.variants (product_id, name, hex, sort, stock) values (pid, 'Neutral Brown', '#5E4433', 0, 0);
    end if;
  end if;
  v_sort := coalesce(v_sort, 16);

  -- ---------- Lápiz de cejas individual (oculto hasta tener precio) ----------
  if not exists (select 1 from public.products where name = 'Lápiz de cejas') then
    insert into public.products (name, subtitle, brand, category, description, price, price_wholesale, image_url, images, swatch_url, sort, active)
    values ('Lápiz de cejas', 'Instant Lift Brow Pencil · individual', 'e.l.f.', 'Ojos y cejas', 'Lápiz retráctil con cepillo, por unidad.', 0, null,
            '/productos/lapiz-cejas-individual.webp', '["/productos/lapiz-cejas-individual.webp"]'::jsonb, '/tonos/lapiz-cejas.webp', v_sort, false)
    returning id into pid;
    insert into public.variants (product_id, name, hex, sort, stock) values
      (pid, 'Taupe', '#8A7262', 0, 0),
      (pid, 'Deep Brown', '#3E2A20', 1, 0);
  end if;

  -- ---------- Delineador plumón negro ----------
  if not exists (select 1 from public.products where name = 'Delineador plumón negro') then
    insert into public.products (name, subtitle, brand, category, description, price, price_wholesale, image_url, images, sort)
    values ('Delineador plumón negro', 'Eyeliner Pen', 'e.l.f.', 'Ojos y cejas', 'Delineador líquido tipo plumón, punta fina.', 8, null,
            '/productos/delineador-plumon.webp', '["/productos/delineador-plumon.webp"]'::jsonb, v_sort)
    returning id into pid;
    insert into public.variants (product_id, name, stock) values (pid, '', 0);
  end if;

  -- ---------- Paleta de sombras: 2 tonos ----------
  select id into pid from public.products where name = 'Paleta de sombras' limit 1;
  if pid is not null and not exists (select 1 from public.variants where product_id = pid and name <> '') then
    select stock into v_old_stock from public.variants where product_id = pid and name = '';
    if coalesce(v_old_stock, 0) > 0 then
      raise notice 'La paleta tenía % unidades sin tono: cárgalas de nuevo en cada tono desde el panel.', v_old_stock;
    end if;
    update public.products
    set subtitle = 'Perfect 10 Eyeshadow · 10 tonos',
        image_url = '/productos/paleta-need-it-nude.webp',
        images = '["/productos/paleta-need-it-nude.webp"]'::jsonb,
        swatch_url = '/tonos/paleta-sombras.webp'
    where id = pid;
    delete from public.variants where product_id = pid and name = '';
    insert into public.variants (product_id, name, hex, image_url, sort, stock) values
      (pid, 'Need It Nude', '#C9A58C', '/productos/paleta-need-it-nude.webp', 0, 0),
      (pid, 'Everyday Smoky', '#5A4A44', '/productos/paleta-everyday-smoky.webp', 1, 0);
  end if;

  -- ---------- Brocha para base ----------
  update public.products set subtitle = 'Buffing Foundation Brush' where name = 'Brocha para base' and subtitle = 'Foundation Brush';
end $$;
