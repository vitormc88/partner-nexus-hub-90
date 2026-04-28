INSERT INTO public.pricing_rules (
  code, label, category, product_family, license_model,
  unit_type, billing_frequency,
  unit_price, support_percentage, currency, active
) VALUES (
  'BUS_USEIT_FACTOR',
  'UseIT derivation factor (% of KeepIT license base)',
  'software',
  'Business',
  'useit',
  'percentage',
  'one-time',
  0,
  37,
  'EUR',
  true
)
ON CONFLICT (code) DO NOTHING;