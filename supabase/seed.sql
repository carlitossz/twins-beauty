-- =====================================================================
-- TWINS BEAUTY · Catálogo inicial (generado con `npm run seed`, no editar a mano)
-- Correr UNA sola vez, después de schema.sql. Las cantidades arrancan en 0:
-- se cargan desde el panel (Inventario o Editar producto).
-- =====================================================================

do $$
declare pid uuid;
begin
  if exists (select 1 from public.products) then
    raise notice 'Ya hay productos cargados: no se cargó nada.';
    return;
  end if;

  -- Polvo Halo Glow
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Polvo Halo Glow', 'Halo Glow Powder Filter · 10 g', 'e.l.f.', 'Rostro', 'Favorito', 'Polvo compacto de cobertura ligera y construible, con acabado glow suave que difumina. Incluye borla y espejo.', 12, 11, '/productos/polvo-halo-glow.webp', '["/productos/polvo-halo-glow.webp"]'::jsonb, '/tonos/polvo-halo-glow.webp', 0, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Fair Cool Neutral', '#F4D3C5', null, '', 0, 0),
    (pid, 'Fair Warm', '#F4DAB6', null, '', 1, 0),
    (pid, 'Light Neutral', '#E7C2A3', null, '', 2, 0),
    (pid, 'Light Warm', '#E9C697', null, '', 3, 0),
    (pid, 'Medium Neutral', '#D4A47F', null, '', 4, 0),
    (pid, 'Medium Warm', '#D6A873', null, '', 5, 0),
    (pid, 'Tan Warm', '#C08B51', null, '', 6, 0),
    (pid, 'Tan Neutral Warm', '#BF8957', null, '', 7, 0),
    (pid, 'Deep Warm', '#986636', null, '', 8, 0),
    (pid, 'Deep Neutral', '#966242', null, '', 9, 0),
    (pid, 'Rich Cool', '#6C3C34', null, '', 10, 0),
    (pid, 'Rich Warm', '#6A4622', null, '', 11, 0);

  -- Gloss Glow Reviver
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Gloss Glow Reviver', 'Glow Reviver Lip Oil', 'e.l.f.', 'Labios', 'Favorito', 'Aceite de labios con brillo jugoso y un toque de color.', 11, 9, '/productos/gloss-glow-reviver.webp', '["/productos/gloss-glow-reviver.webp"]'::jsonb, '/tonos/gloss-glow-reviver.webp', 1, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Honey Talks', '#7A4A3E', null, 'Clásicos', 0, 0),
    (pid, 'Coral Fixation', '#F2734E', null, 'Clásicos', 1, 0),
    (pid, 'Jam Session', '#6E1630', null, 'Clásicos', 2, 0),
    (pid, 'It''s Giving Guava', '#E9776A', null, 'Clásicos', 3, 0),
    (pid, 'Crystal Clear', '#EEEAE6', null, 'Clásicos', 4, 0),
    (pid, 'Red Delicious', '#E0283A', null, 'Clásicos', 5, 0),
    (pid, 'Money Mauve', '#9B6866', null, 'Clásicos', 6, 0),
    (pid, 'Pink Quartz', '#F5A3A0', null, 'Clásicos', 7, 0),
    (pid, 'Rose Envy', '#C9495A', null, 'Clásicos', 8, 0),
    (pid, 'Opal-ogy Tour', '#D9D6EE', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 9, 0),
    (pid, 'Citrine Gleam', '#E2C368', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 10, 0),
    (pid, 'Crystal Baller', '#D7B79A', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 11, 0),
    (pid, 'Candy Coded', '#F0B2A8', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 12, 0),
    (pid, 'Super-Neutral', '#D9844A', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 13, 0),
    (pid, 'Princess Cut', '#E58C86', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 14, 0),
    (pid, 'Divine Wine', '#B5506A', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 15, 0),
    (pid, 'Chocoluxe', '#B3743F', '/tonos/gloss-glow-reviver-brillo.webp', 'Con brillo', 16, 0);

  -- Tinta labios y mejillas
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Tinta labios y mejillas', 'Lip & Cheek Tint', 'e.l.f.', 'Labios', '', 'Tinta ligera para labios y mejillas.', 9, 7, '/productos/tinta-labios-mejillas.webp', '["/productos/tinta-labios-mejillas.webp"]'::jsonb, '/tonos/tinta-labios-mejillas.webp', 2, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Cherry Cola', '#7A1E26', null, '', 0, 0),
    (pid, 'Plums Up', '#B9578A', null, '', 1, 0),
    (pid, 'Left On Red', '#E3263A', null, '', 2, 0),
    (pid, 'Pink Positive', '#F06A9C', null, '', 3, 0),
    (pid, 'Orange Crush', '#F2843C', null, '', 4, 0);

  -- Lip balm Glow Reviver
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Lip balm Glow Reviver', 'Glow Reviver Melting Lip Balm', 'e.l.f.', 'Labios', '', 'Bálsamo que se derrite en los labios, con color y brillo.', 8, 6, '/productos/lip-balm-melting.webp', '["/productos/lip-balm-melting.webp"]'::jsonb, '/tonos/lip-balm-melting.webp', 3, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Blue Razz Slushy', '#3AA7DD', null, '', 0, 0),
    (pid, 'Vanilla Soft Serve', '#F6E3B4', null, '', 1, 0),
    (pid, 'Island Colada', '#F2EEE6', null, '', 2, 0),
    (pid, 'Peach Ring', '#F4B39A', null, '', 3, 0),
    (pid, 'Sherbet Punch', '#F08AA3', null, '', 4, 0),
    (pid, 'Wild Cherry', '#D0334C', null, '', 5, 0),
    (pid, 'Candied Cranberry', '#9C2A4A', null, '', 6, 0),
    (pid, 'Yummy Gummy', '#8E3B66', null, '', 7, 0),
    (pid, 'Cotton Candy Crush', '#E3A0D6', null, '', 8, 0),
    (pid, 'Pink Lemonade', '#F59DB5', null, '', 9, 0),
    (pid, 'Vanilla Toffee', '#B98258', null, '', 10, 0),
    (pid, 'Blackberry Sorbet', '#6A3448', null, '', 11, 0);

  -- Lip Oil Stick
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Lip Oil Stick', 'Glow Reviver Lip Oil Stick', 'e.l.f.', 'Labios', '', '', 7, 5, '/productos/lip-oil-stick.webp', '["/productos/lip-oil-stick.webp"]'::jsonb, null, 4, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Corrector Soft Glam
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Corrector Soft Glam', 'Soft Glam Satin Concealer', 'e.l.f.', 'Rostro', '', 'Corrector de cobertura media construible y acabado satinado.', 6, 4, '/productos/corrector-soft-glam.webp', '["/productos/corrector-soft-glam.webp"]'::jsonb, '/tonos/corrector-soft-glam.webp', 5, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, '10 Fair Cool', '#F6D0C8', null, 'Claros', 0, 0),
    (pid, '11 Fair Neutral', '#F0D4C0', null, 'Claros', 1, 0),
    (pid, '12 Fair Warm', '#F0D6B2', null, 'Claros', 2, 0),
    (pid, '13 Fair Neutral', '#EBCFBB', null, 'Claros', 3, 0),
    (pid, '14 Fair Cool', '#EDC7BF', null, 'Claros', 4, 0),
    (pid, '15 Fair Warm', '#E9CFAB', null, 'Claros', 5, 0),
    (pid, '20 Light Cool', '#EBBCA9', null, 'Claros', 6, 0),
    (pid, '21 Light Neutral', '#E5C0A1', null, 'Claros', 7, 0),
    (pid, '22 Light Warm', '#E5C293', null, 'Claros', 8, 0),
    (pid, '23 Light Cool', '#E4B5A2', null, 'Claros', 9, 0),
    (pid, '24 Light Warm', '#E0BD8E', null, 'Claros', 10, 0),
    (pid, '25 Light Neutral', '#DCB798', null, 'Claros', 11, 0),
    (pid, '30 Medium Warm', '#D6A873', null, 'Medios', 12, 0),
    (pid, '31 Medium Neutral', '#D2A27D', null, 'Medios', 13, 0),
    (pid, '32 Medium Neutral', '#D0A07B', null, 'Medios', 14, 0),
    (pid, '33 Medium Warm', '#CFA16C', null, 'Medios', 15, 0),
    (pid, '34 Medium Cool', '#CF957C', null, 'Medios', 16, 0),
    (pid, '35 Medium Cool', '#CD937A', null, 'Medios', 17, 0),
    (pid, '40 Tan Warm', '#C08B51', null, 'Medios', 18, 0),
    (pid, '41 Tan Neutral', '#BC855B', null, 'Medios', 19, 0),
    (pid, '42 Tan Neutral', '#BA8359', null, 'Medios', 20, 0),
    (pid, '43 Tan Cool', '#BB7A5C', null, 'Medios', 21, 0),
    (pid, '44 Tan Cool', '#B9785A', null, 'Medios', 22, 0),
    (pid, '45 Tan Warm', '#B58046', null, 'Medios', 23, 0),
    (pid, '50 Deep Warm', '#986636', null, 'Oscuros', 24, 0),
    (pid, '51 Deep Cool', '#985A46', null, 'Oscuros', 25, 0),
    (pid, '52 Deep Cool', '#965844', null, 'Oscuros', 26, 0),
    (pid, '53 Deep Neutral', '#8F5B3B', null, 'Oscuros', 27, 0),
    (pid, '54 Deep Neutral', '#8D5939', null, 'Oscuros', 28, 0),
    (pid, '55 Deep Warm', '#8D5B2B', null, 'Oscuros', 29, 0),
    (pid, '60 Rich Cool', '#6C3C34', null, 'Oscuros', 30, 0),
    (pid, '61 Rich Cool', '#6A3A32', null, 'Oscuros', 31, 0),
    (pid, '62 Rich Warm', '#66421E', null, 'Oscuros', 32, 0),
    (pid, '63 Rich Warm', '#633F1B', null, 'Oscuros', 33, 0),
    (pid, '64 Rich Neutral', '#5F3925', null, 'Oscuros', 34, 0),
    (pid, '65 Rich Neutral', '#5D3723', null, 'Oscuros', 35, 0);

  -- Corrector Camo tapa blanca
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Corrector Camo tapa blanca', 'Hydrating Camo Concealer · acabado satinado', 'e.l.f.', 'Rostro', '', 'Corrector hidratante de alta cobertura con acabado satinado.', 10, 8, '/productos/corrector-camo-hidratante.webp', '["/productos/corrector-camo-hidratante.webp"]'::jsonb, '/tonos/corrector-camo-hidratante.webp', 6, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Fair Rose', '#F8CEC4', null, 'Claros', 0, 0),
    (pid, 'Fair Warm', '#F4DAB6', null, 'Claros', 1, 0),
    (pid, 'Fair Beige', '#F2D6BE', null, 'Claros', 2, 0),
    (pid, 'Light Sand', '#E7C59B', null, 'Claros', 3, 0),
    (pid, 'Light Peach', '#EDC09D', null, 'Claros', 4, 0),
    (pid, 'Light Beige', '#E7C29F', null, 'Claros', 5, 0),
    (pid, 'Medium Peach', '#DAA279', null, 'Medios', 6, 0),
    (pid, 'Medium Sand', '#D4A777', null, 'Medios', 7, 0),
    (pid, 'Medium Beige', '#D4A47B', null, 'Medios', 8, 0),
    (pid, 'Tan Sand', '#BE8A55', null, 'Medios', 9, 0),
    (pid, 'Tan Walnut', '#B47B55', null, 'Medios', 10, 0),
    (pid, 'Tan Latte', '#BA8357', null, 'Medios', 11, 0),
    (pid, 'Deep Olive', '#926634', null, 'Oscuros', 12, 0),
    (pid, 'Deep Chestnut', '#8E5834', null, 'Oscuros', 13, 0),
    (pid, 'Deep Cinnamon', '#96562E', null, 'Oscuros', 14, 0),
    (pid, 'Rich Chocolate', '#5E3826', null, 'Oscuros', 15, 0),
    (pid, 'Rich Cocoa', '#623828', null, 'Oscuros', 16, 0),
    (pid, 'Rich Ebony', '#4A2C20', null, 'Oscuros', 17, 0);

  -- Corrector Camo tapa negra
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Corrector Camo tapa negra', '16HR Camo Concealer · acabado mate', 'e.l.f.', 'Rostro', '', 'Corrector de alta cobertura y larga duración, acabado mate.', 10, 8, '/productos/corrector-camo-16h.webp', '["/productos/corrector-camo-16h.webp"]'::jsonb, null, 7, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Fair Warm', '#F4DAB6', null, 'Claros', 0, 0),
    (pid, 'Fair Beige', '#F2D6BE', null, 'Claros', 1, 0),
    (pid, 'Fair Rose', '#F8CEC4', null, 'Claros', 2, 0),
    (pid, 'Light Beige', '#E7C29F', null, 'Claros', 3, 0),
    (pid, 'Light Ivory', '#EBC89F', null, 'Claros', 4, 0),
    (pid, 'Light Peach', '#EDC09D', null, 'Claros', 5, 0),
    (pid, 'Medium Golden', '#D8AA6B', null, 'Medios', 6, 0),
    (pid, 'Medium Warm', '#D6A873', null, 'Medios', 7, 0),
    (pid, 'Medium Beige', '#D4A47B', null, 'Medios', 8, 0),
    (pid, 'Medium Neutral', '#D4A47F', null, 'Medios', 9, 0),
    (pid, 'Medium Sand', '#D4A777', null, 'Medios', 10, 0),
    (pid, 'Medium Peach', '#DAA279', null, 'Medios', 11, 0),
    (pid, 'Tan Neutral', '#BE875D', null, 'Medios', 12, 0),
    (pid, 'Tan Sand', '#BE8A55', null, 'Medios', 13, 0),
    (pid, 'Tan Latte', '#BA8357', null, 'Medios', 14, 0),
    (pid, 'Tan Walnut', '#B47B55', null, 'Medios', 15, 0),
    (pid, 'Deep Olive', '#926634', null, 'Oscuros', 16, 0),
    (pid, 'Deep Chestnut', '#8E5834', null, 'Oscuros', 17, 0),
    (pid, 'Deep Caramel', '#A06430', null, 'Oscuros', 18, 0),
    (pid, 'Deep Cinnamon', '#96562E', null, 'Oscuros', 19, 0),
    (pid, 'Rich Chocolate', '#5E3826', null, 'Oscuros', 20, 0),
    (pid, 'Rich Walnut', '#5E3626', null, 'Oscuros', 21, 0),
    (pid, 'Rich Cocoa', '#623828', null, 'Oscuros', 22, 0),
    (pid, 'Rich Ebony', '#4A2C20', null, 'Oscuros', 23, 0);

  -- Corrector de color Camo
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Corrector de color Camo', 'Camo Color Corrector', 'e.l.f.', 'Rostro', '', 'Durazno y naranja neutralizan ojeras; verde neutraliza rojeces.', 5, 4, '/productos/corrector-color-durazno.webp', '["/productos/corrector-color-durazno.webp"]'::jsonb, null, 8, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Durazno', '#F1C3AE', '/productos/corrector-color-durazno.webp', '', 0, 0),
    (pid, 'Verde', '#BFD8B0', '/productos/corrector-color-verde.webp', '', 1, 0),
    (pid, 'Naranja', '#E9895A', '/productos/corrector-color-naranja.webp', '', 2, 0);

  -- Rubor líquido Camo
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Rubor líquido Camo', 'Camo Liquid Blush', 'e.l.f.', 'Rostro', '', 'Rubor líquido de alta pigmentación y larga duración, acabado jugoso.', 11, 9, '/productos/rubor-liquido-camo.webp', '["/productos/rubor-liquido-camo.webp"]'::jsonb, '/tonos/rubor-liquido-camo.webp', 9, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Bold-Faced Lily', '#E37AAE', null, '', 0, 0),
    (pid, 'Bronze Bomb', '#6E3526', null, '', 1, 0),
    (pid, 'Cheeky Lychee', '#F0717E', null, '', 2, 0),
    (pid, 'Copper Etiquette', '#B4563E', null, '', 3, 0),
    (pid, 'Coral Crush', '#F24A2E', null, '', 4, 0),
    (pid, 'Dusty Rosé', '#B97680', null, '', 5, 0),
    (pid, 'Gorg Orange', '#F0442A', null, '', 6, 0),
    (pid, 'Peach Perfect', '#F08A6E', null, '', 7, 0),
    (pid, 'Pinky Promise', '#E8317A', null, '', 8, 0),
    (pid, 'Suave Mauve', '#9E5560', null, '', 9, 0),
    (pid, 'Berry Well', '#8E1C40', null, '', 10, 0),
    (pid, 'Comin'' In Hot Pink', '#EE2C6C', null, '', 11, 0);

  -- Rubor líquido Halo Glow
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Rubor líquido Halo Glow', 'Halo Glow Blush Beauty Wand', 'e.l.f.', 'Rostro', '', 'Rubor líquido con aplicador de esponja y acabado luminoso.', 10, 8, '/productos/rubor-halo-glow.webp', '["/productos/rubor-halo-glow.webp"]'::jsonb, '/tonos/rubor-halo-glow.webp', 10, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Candlelit', '#E9A88E', null, '', 0, 0),
    (pid, 'Rosé You Slay', '#E39AA0', null, '', 1, 0),
    (pid, 'Magic Hour', '#D99A62', null, '', 2, 0),
    (pid, 'Berry Radiant', '#D06A8A', null, '', 3, 0),
    (pid, 'You Go Cocoa', '#C06A4A', null, '', 4, 0),
    (pid, 'Pink-Me-Up', '#E28296', null, '', 5, 0);

  -- Primer Putty minimizador de poros
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Primer Putty minimizador de poros', 'Poreless Putty Primer', 'e.l.f.', 'Rostro', '', '', 10, 8, '/productos/primer-putty-poros.webp', '["/productos/primer-putty-poros.webp"]'::jsonb, null, 11, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Primer Putty matte
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Primer Putty matte', 'Matte Putty Primer', 'e.l.f.', 'Rostro', '', '', 10, 8, '/productos/primer-putty-matte.webp', '["/productos/primer-putty-matte.webp"]'::jsonb, null, 12, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Máscara Big Mood
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Máscara Big Mood', 'Big Mood Mascara · Mega Volume & Lift', 'e.l.f.', 'Ojos y cejas', '', 'Fórmula tradicional: se lava fácil, para uso diario.', 10, 8, '/productos/mascara-big-mood.webp', '["/productos/mascara-big-mood.webp"]'::jsonb, '/tonos/mascara-big-mood.webp', 13, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Negro', '#1A1A1A', null, '', 0, 0),
    (pid, 'Marrón', '#4A2E22', null, '', 1, 0);

  -- Máscara Big Mood waterproof
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Máscara Big Mood waterproof', 'Big Mood Mascara Waterproof', 'e.l.f.', 'Ojos y cejas', '', 'A prueba de agua y de larga duración.', 10, 8, '/productos/mascara-big-mood-waterproof.webp', '["/productos/mascara-big-mood-waterproof.webp"]'::jsonb, '/tonos/mascara-big-mood.webp', 14, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Negro incondicional', '#1A1A1A', null, '', 0, 0),
    (pid, 'Marrón resistente', '#4A2E22', null, '', 1, 0);

  -- Pestañina Lash XTNDR
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Pestañina Lash XTNDR', 'Lash XTNDR Tubing Mascara', 'e.l.f.', 'Ojos y cejas', '', '', 8, 6, '/productos/pestanina-lash-xtndr.webp', '["/productos/pestanina-lash-xtndr.webp"]'::jsonb, '/tonos/pestanina-lash-xtndr.webp', 15, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Negro profundo', '#141414', null, '', 0, 0),
    (pid, 'Marrón intenso', '#5A3524', null, '', 1, 0);

  -- Set lápiz de cejas
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Set lápiz de cejas', 'Instant Lift Brow Pencil · set de 2', 'e.l.f.', 'Ojos y cejas', '', 'Set de 2 lápices retráctiles con cepillo. En set solo viene en Neutral Brown.', 6, 4, '/productos/lapiz-cejas.webp', '["/productos/lapiz-cejas.webp"]'::jsonb, '/tonos/lapiz-cejas.webp', 16, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Neutral Brown', '#5E4433', null, '', 0, 0);

  -- Lápiz de cejas
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Lápiz de cejas', 'Instant Lift Brow Pencil · individual', 'e.l.f.', 'Ojos y cejas', '', 'Lápiz retráctil con cepillo, por unidad.', 0, null, '/productos/lapiz-cejas-individual.webp', '["/productos/lapiz-cejas-individual.webp"]'::jsonb, '/tonos/lapiz-cejas.webp', 17, false) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Taupe', '#8A7262', null, '', 0, 0),
    (pid, 'Deep Brown', '#3E2A20', null, '', 1, 0);

  -- Delineador plumón negro
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Delineador plumón negro', 'Eyeliner Pen', 'e.l.f.', 'Ojos y cejas', '', 'Delineador líquido tipo plumón, punta fina.', 8, null, '/productos/delineador-plumon.webp', '["/productos/delineador-plumon.webp"]'::jsonb, null, 18, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Gel para cejas y pestañas
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Gel para cejas y pestañas', 'Gel transparente', 'e.l.f.', 'Ojos y cejas', '', '', 5, null, '/productos/gel-cejas-pestanas.webp', '["/productos/gel-cejas-pestanas.webp"]'::jsonb, null, 19, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Paleta de sombras
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Paleta de sombras', 'Perfect 10 Eyeshadow · 10 tonos', 'e.l.f.', 'Ojos y cejas', 'Nuevo', '', 11, 9, '/productos/paleta-need-it-nude.webp', '["/productos/paleta-need-it-nude.webp"]'::jsonb, '/tonos/paleta-sombras.webp', 20, true) returning id into pid;
  insert into public.variants (product_id, name, hex, image_url, grp, sort, stock) values
    (pid, 'Need It Nude', '#C9A58C', '/productos/paleta-need-it-nude.webp', '', 0, 0),
    (pid, 'Everyday Smoky', '#5A4A44', '/productos/paleta-everyday-smoky.webp', '', 1, 0);

  -- Brocha para líquidos o polvos
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Brocha para líquidos o polvos', 'Complexion Duo Brush', 'e.l.f.', 'Brochas', '', '', 8, null, '/productos/brocha-liquidos-polvos.webp', '["/productos/brocha-liquidos-polvos.webp"]'::jsonb, null, 21, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Brocha para base
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Brocha para base', 'Buffing Foundation Brush', 'e.l.f.', 'Brochas', '', '', 8, null, '/productos/brocha-base.webp', '["/productos/brocha-base.webp"]'::jsonb, null, 22, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Set de brochas Full Face
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Set de brochas Full Face', 'Flawless Face & Eye Brush Set', 'e.l.f.', 'Brochas', '', '', 25, null, '/productos/set-brochas-full-face.webp', '["/productos/set-brochas-full-face.webp"]'::jsonb, null, 23, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

  -- Crema hidratante Toleriane
  insert into public.products (name, subtitle, brand, category, badge, description, price, price_wholesale, image_url, images, swatch_url, sort, active) values ('Crema hidratante Toleriane', 'Toleriane Double Repair Face Moisturizer', 'La Roche-Posay', 'Skincare', '', '', 20, null, '/productos/crema-toleriane.webp', '["/productos/crema-toleriane.webp"]'::jsonb, null, 24, true) returning id into pid;
  insert into public.variants (product_id, name, stock) values (pid, '', 0);

end $$;
