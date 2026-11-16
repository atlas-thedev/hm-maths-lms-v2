-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0032 — Seed configured 2027 & 2028 A/L Combined Maths classes
-- Safe to re-run (idempotent upserts by fixed UUID).
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.classes (
  id, title, description, class_type, target_year, town, fee,
  schedule, schedule_days, start_time, duration_minutes,
  banner_url, banner_config, is_active, is_free, posts_tutes
) VALUES
  (
    '82566b86-a2b3-4202-aa17-49a057a4e3ce',
    '2028 A/L Combined Maths - Paper Class',
    E'2028 A/L Combined Maths Paper Class එක.\n\nසාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom හරහා (Recordings සහිතයි).\nඕනෑම පැය 2ක් පැමිණ ප්‍රශ්න පත්‍රය ලියන්න:\n• සක්යා - පානදුර: ඉරිදා 12.00 – 2.00 / බදාදා 2.30 – 5.00\n• රසන්යා - කළුතර: ඉරිදා 11.30 – 1.30 / බ්‍රහස්පතින්දා 2.30 – 5.00\n• විදුල - හොරණ: බදාදා 2.30 – 5.00 / සිකුරාදා 2.30 – 5.00\n• පැනෝලා - මතුගම: සඳුදා 2.30 – 5.00 / සෙනසුරාදා 8.30 – 10.30',
    'Paper Class', 2028, 'Online', 2000.00,
    NULL, ARRAY[0], '18:30:00'::time, 120,
    NULL, '{"badge":"PAPER CLASS","tagline":"ප්‍රශ්න පත්‍ර ලිවීම හා ලකුණු ලබාදීම","headline":"","subtitle":"ප්‍රශ්න පත්‍ර සාකච්ඡාව","template":"paper","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    '3dc18520-ebb2-49f2-8efd-e74ff688e82b',
    '2028 A/L Combined Maths - Theory',
    E'ශ්‍රිත (Functions)\nලඝුගණක හා අසමානතා (Logarithms & Inequalities)\nබහුපද ශ්‍රිත (Polynomial Functions)\nත්‍රිකෝණමිතිය හා සාධාරණ විසදුම් (Trigonometry & General Solutions)\nදෛශික (Vectors)',
    'Theory', 2028, 'Online', 3600.00,
    NULL, ARRAY[0], '14:30:00'::time, 210,
    NULL, '{"badge":"THEORY","tagline":"මුල සිට සරලව සිද්ධාන්ත ආවරණය","headline":"","subtitle":"Combined Maths Theory","template":"brand","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    '6e630bbd-080a-4c9b-8566-a1e5702e8685',
    '2027 A/L Combined Maths - Paper Class',
    E'2027 A/L Combined Maths Paper Class එක.\n\nපන්ති කාලසටහන:\n• පැනෝලා - මතුගම: සඳුදා ප.ව. 2.30 – 5.00\n• විදුල - හොරණ: අඟහරුවාදා ප.ව. 2.30 – 5.00\n• සක්යා - පානදුර & ONLINE: බදාදා ප.ව. 2.30 – 5.00\n• රසන්යා - කළුතර: බ්‍රහස්පතින්දා ප.ව. 2.30 – 5.00\n• Online Discussions & Recordings',
    'Paper Class', 2027, 'Online', 2000.00,
    NULL, ARRAY[3], '14:30:00'::time, 150,
    NULL, '{"badge":"PAPER CLASS","tagline":"විභාග මට්ටමේ ප්‍රශ්න පත්‍ර සාකච්ඡාව","headline":"","subtitle":"ප්‍රශ්න පත්‍ර සාකච්ඡාව","template":"paper","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    '63c4d864-e393-41e5-b1a8-21276d25a366',
    '2027 A/L Combined Maths - Revision',
    E'2027 A/L Combined Maths Revision පන්තිය.\n\nපන්ති කාලසටහන:\n• පැනෝලා - මතුගම: සඳුදා පෙ.ව. 8.00 – 1.30\n• විදුල - හොරණ: අඟහරුවාදා පෙ.ව. 8.00 – 1.30\n• සක්යා - පානදුර & ONLINE: බදාදා පෙ.ව. 8.00 – 1.30\n• රසන්යා - කළුතර: බ්‍රහස්පතින්දා පෙ.ව. 8.00 – 1.30\n• Online Live & Recordings',
    'Revision', 2027, 'Online', 3500.00,
    NULL, ARRAY[3], '08:00:00'::time, 330,
    NULL, '{"badge":"REVISION","tagline":"විභාග ඉලක්කගත වේගවත් පුනරීක්ෂණය","headline":"","subtitle":"Combined Maths Revision","template":"midnight","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    '874143e4-0e17-4462-a755-e051bf9db22e',
    '2027 A/L Combined Maths - Theory',
    E'හසිත මධුසංක සර්ගේ 2027 A/L Combined Maths Theory පන්තිය.\n\nපන්ති කාලසටහන:\n• සක්යා - පානදුර: සඳුදා ප.ව. 3.00 – 6.30\n• විදුල - හොරණ: බ්‍රහස්පතින්දා ප.ව. 3.30 – 6.30\n• රසන්යා - කළුතර: සෙනසුරාදා ප.ව. 2.00 – 5.00\n• පැනෝලා - මතුගම: ඉරිදා පෙ.ව. 11.00 – ප.ව. 2.00\n• Online Live & Recordings',
    'Theory', 2027, 'Online', 3500.00,
    NULL, ARRAY[1], '15:00:00'::time, 210,
    NULL, '{"badge":"THEORY","tagline":"A සාමාර්ථයක් සහතික කෙරෙන අසමසම සිද්ධාන්ත පන්තිය","headline":"","subtitle":"Combined Maths Theory","template":"brand","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    'cee372b5-e898-4703-8265-2fdd2bdfd1e8',
    '2028 A/L Combined Maths - Theory + Paper Class',
    '2028 A/L Theory සහ Paper Class පන්ති දෙකම ඇතුළත් පැකේජය.',
    'Combo', 2028, 'Online', 4600.00,
    NULL, '{}', NULL, 120,
    NULL, '{"badge":"COMBO PACK","tagline":"සිද්ධාන්ත හා ප්‍රශ්න පත්‍ර එකම පැකේජයකින්","headline":"","subtitle":"Theory + Paper Class","template":"attention","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    'cf87be3c-4c21-4d11-87fe-96e39888d8b7',
    '2027 A/L Combined Maths - Full Pack (Theory + Revision + Paper)',
    '2027 A/L Theory, Revision, සහ Paper Class යන පන්ති තුනම ඇතුළත් සම්පූර්ණ Combined Maths පැකේජය. (ගාස්තුව: Rs. 5,500/-)',
    'Combo', 2027, 'Online', 5500.00,
    NULL, '{}', NULL, 120,
    NULL, '{"badge":"FULL PACK","tagline":"සියලුම පන්ති එකම පැකේජයකින්","headline":"","subtitle":"Theory + Revision + Paper","template":"sunrise","headlineMode":"month"}'::jsonb,
    true, false, true
  ),
  (
    '5520ef8d-7019-445e-ab3a-5970f391bd30',
    '2027 A/L Combined Maths - Revision + Paper Class',
    E'Revision + Paper Class පන්ති දෙකම සඳහා වන Combo Package එක.\n\n• පැනෝලා - මතුගම: සඳුදා\n• විදුල - හොරණ: අඟහරුවාදා\n• සක්යා - පානදුර & ONLINE: බදාදා\n• රසන්යා - කළුතර: බ්‍රහස්පතින්දා',
    'Combo', 2027, 'Online', 4500.00,
    NULL, '{}', NULL, 120,
    NULL, '{"badge":"COMBO PACK","tagline":"පුනරීක්ෂණ සහ ප්‍රශ්න පත්‍ර සම්පූර්ණ පැකේජය","headline":"","subtitle":"Revision + Paper Class","template":"attention","headlineMode":"month"}'::jsonb,
    true, false, true
  )
ON CONFLICT (id) DO UPDATE SET
  title            = EXCLUDED.title,
  description      = EXCLUDED.description,
  class_type       = EXCLUDED.class_type,
  target_year      = EXCLUDED.target_year,
  town             = EXCLUDED.town,
  fee              = EXCLUDED.fee,
  schedule         = EXCLUDED.schedule,
  schedule_days    = EXCLUDED.schedule_days,
  start_time       = EXCLUDED.start_time,
  duration_minutes = EXCLUDED.duration_minutes,
  banner_config    = EXCLUDED.banner_config,
  is_active        = EXCLUDED.is_active,
  is_free          = EXCLUDED.is_free,
  posts_tutes      = EXCLUDED.posts_tutes;

INSERT INTO public.combo_items (combo_id, class_id) VALUES
  ('cee372b5-e898-4703-8265-2fdd2bdfd1e8', '3dc18520-ebb2-49f2-8efd-e74ff688e82b'),
  ('cee372b5-e898-4703-8265-2fdd2bdfd1e8', '82566b86-a2b3-4202-aa17-49a057a4e3ce'),
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '6e630bbd-080a-4c9b-8566-a1e5702e8685'),
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '63c4d864-e393-41e5-b1a8-21276d25a366'),
  ('cf87be3c-4c21-4d11-87fe-96e39888d8b7', '874143e4-0e17-4462-a755-e051bf9db22e'),
  ('5520ef8d-7019-445e-ab3a-5970f391bd30', '6e630bbd-080a-4c9b-8566-a1e5702e8685'),
  ('5520ef8d-7019-445e-ab3a-5970f391bd30', '63c4d864-e393-41e5-b1a8-21276d25a366')
ON CONFLICT DO NOTHING;
