-- Métodos de pago reales de Twins Beauty.
-- Cambia Pago móvil, Binance y Zelle; deja igual los demás (ej. Efectivo $).
-- Zelle va SIN datos a propósito: la página le dice a la clienta que los pida por WhatsApp
-- y el mensaje del pedido ya los pide. Se puede correr más de una vez.
update public.settings s
set payment_methods = '[
  {"name":"Pago móvil","currency":"BS","note":"A la tasa del día.","enabled":true,"cash":false,
   "fields":[{"label":"Banco","value":"Banco de Venezuela (0102)","copyable":false},
             {"label":"Teléfono","value":"04247078785","copyable":true},
             {"label":"Cédula","value":"1015751","copyable":true}]},
  {"name":"Binance","currency":"USD","note":"Pago en USDT por Binance Pay.","enabled":true,"cash":false,
   "fields":[{"label":"ID Binance Pay","value":"745977899","copyable":true}]},
  {"name":"Zelle","currency":"USD","note":"","enabled":true,"cash":false,"fields":[]}
]'::jsonb || coalesce((
  select jsonb_agg(pm order by ord)
  from jsonb_array_elements(s.payment_methods) with ordinality as t(pm, ord)
  where pm->>'name' not in ('Pago móvil', 'Binance', 'Zelle')
), '[]'::jsonb),
updated_at = now()
where s.id = 1;

-- Para revisar cómo quedó:
select jsonb_pretty(payment_methods) from public.settings where id = 1;
