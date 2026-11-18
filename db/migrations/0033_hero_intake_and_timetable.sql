-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0033 — DB-backed Hero Intake Promo & Public Timetable
-- Safe to re-run (idempotent schema + ON CONFLICT DO NOTHING seeds).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.timetable_entries (
  id          uuid primary key default gen_random_uuid(),
  batch_year  integer not null check (batch_year between 2020 and 2099),
  class_type  text not null default 'Theory',
  title       text not null,
  center_key  text not null,
  hall_name   text not null default '',
  day_label   text not null,
  time_label  text not null,
  fee_label   text not null default '',
  start_note  text not null default '',
  details     text not null default '',
  class_id    uuid references public.classes (id) on delete set null,
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists timetable_entries_active_idx
  on public.timetable_entries (is_active, batch_year desc, sort_order asc, created_at asc);

alter table public.timetable_entries enable row level security;

drop policy if exists "timetable public read" on public.timetable_entries;
create policy "timetable public read" on public.timetable_entries
  for select to anon, authenticated
  using (is_active = true or public.is_developer());

drop policy if exists "timetable dev manage" on public.timetable_entries;
create policy "timetable dev manage" on public.timetable_entries
  for all to authenticated
  using (public.is_developer())
  with check (public.is_developer());

grant select on public.timetable_entries to anon, authenticated;
grant all on public.timetable_entries to authenticated;

-- Seed default Hero Promo Card (left spotlight slot on landing hero; fully editable from /dev/timetable)
insert into public.system_settings (key, value)
values (
  'hero_promo',
  '{
    "enabled": true,
    "year": "2029",
    "badgeEn": "NEW INTAKE",
    "badgeSi": "නව බඳවා ගැනීම්",
    "titleEn": "2029 A/L New Class Registration",
    "titleSi": "2029 නව පන්ති ලියාපදිංචිය",
    "subtitleEn": "Physical Centers & Island-wide Online · Full Schedule & Details",
    "subtitleSi": "පානදුර · හොරණ · කළුතර · මතුගම · නුගේගොඩ සහ Online · සම්පූර්ණ විස්තර",
    "ctaEn": "View Timetable",
    "ctaSi": "කාලසටහන බලන්න",
    "href": "/timetable?year=2029"
  }'::jsonb
)
on conflict (key) do nothing;

-- Seed initial Timetable Entries (2029 New Intake + 2028 A/L + 2027 A/L; editable/deletable in /dev/timetable)
insert into public.timetable_entries (
  id, batch_year, class_type, title, center_key, hall_name, day_label, time_label,
  fee_label, start_note, details, class_id, is_featured, is_active, sort_order
) values
  -- 2029 A/L New Intake
  (
    'a1290001-0000-4000-8000-000000000001',
    2029, 'Theory', '2029 A/L Combined Maths - Theory',
    'Panadura', 'සක්යා (Sakya) · පානදුර',
    'සෙනසුරාදා / Saturday', 'පෙ.ව. 8.00 – 11.30',
    'පළමු දින නොමිලේ', 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
    E'• Pure & Applied Maths මුල සිට සරලව\n• සම්පූර්ණ මුද්‍රිත නිබන්ධන (Tutes) පළමු දිනම\n• WhatsApp: 070 3399 339',
    null, true, true, 10
  ),
  (
    'a1290002-0000-4000-8000-000000000002',
    2029, 'Theory', '2029 A/L Combined Maths - Theory',
    'Horana', 'විදුල (Vidula) · හොරණ',
    'ඉරිදා / Sunday', 'පෙ.ව. 8.00 – 11.30',
    'පළමු දින නොමිලේ', 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
    E'• මුල සිට සිද්ධාන්ත ආවරණය සහ කෙටි ක්‍රම\n• සතිපතා ප්‍රශ්න පත්‍ර හා ප්‍රගති වාර්තා\n• විමසීම්: 077 2654 198',
    null, true, true, 20
  ),
  (
    'a1290003-0000-4000-8000-000000000003',
    2029, 'Theory', '2029 A/L Combined Maths - Theory',
    'Kalutara', 'රසන්යා (Rasanya) · කළුතර',
    'සිකුරාදා / Friday', 'ප.ව. 2.30 – 5.30',
    'පළමු දින නොමිලේ', 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
    E'• සිද්ධාන්ත, නිබන්ධන සහ පුහුණු අභ්‍යාස\n• මග හැරුණු පාඩම් HD Recording ලෙස LMS හරහා',
    null, true, true, 30
  ),
  (
    'a1290004-0000-4000-8000-000000000004',
    2029, 'Theory', '2029 A/L Combined Maths - Theory',
    'Mathugama', 'පැනෝලා (Panola) · මතුගම',
    'බදාදා / Wednesday', 'ප.ව. 2.30 – 5.30',
    'පළමු දින නොමිලේ', 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
    E'• මුල සිට සරලව Pure & Applied ගණිතය\n• සම්පූර්ණ නිබන්ධන කට්ටලය සමඟින්',
    null, true, true, 40
  ),
  (
    'a1290005-0000-4000-8000-000000000005',
    2029, 'Theory', '2029 A/L Combined Maths - Theory',
    'Nugegoda', 'රොටරි (Rotary) · නුගේගොඩ',
    'අඟහරුවාදා / Tuesday', 'ප.ව. 2.30 – 5.30',
    'පළමු දින නොමිලේ', 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
    E'• කොළඹ සහ නුගේගොඩ සිසුන් සඳහා නව Theory පන්තිය\n• සජීවී පන්ති + LMS Recording ප්‍රවේශය',
    null, true, true, 50
  ),
  (
    'a1290006-0000-4000-8000-000000000006',
    2029, 'Theory', '2029 A/L Combined Maths - Online Live',
    'Online', 'Zoom Live + HD Recordings (දිවයින පුරා)',
    'සෙනසුරාදා / Saturday', 'ප.ව. 6.30 – 9.30',
    'නිවසටම නිබන්ධන එවනු ලැබේ', 'දිවයිනේ ඕනෑම තැනක සිට Online',
    E'• සජීවී Zoom පන්ති සහ ඕනෑම වේලාවක නැරඹිය හැකි HD Recordings\n• මුද්‍රිත නිබන්ධන කුරියර් / තැපැල් මඟින් නිවසටම\n• සතිපතා Online MCQ පරීක්ෂණ',
    null, true, true, 60
  ),

  -- 2028 A/L Active Classes
  (
    'a1280001-0000-4000-8000-000000000001',
    2028, 'Theory', '2028 A/L Combined Maths - Theory',
    'Online', 'Online Live & Physical Centers',
    'ඉරිදා / Sunday', 'ප.ව. 2.30 – 6.00',
    'LKR 3,600 / මසකට', 'සක්‍රීය Theory පන්තිය',
    E'• ශ්‍රිත, ලඝුගණක හා අසමානතා, බහුපද ශ්‍රිත, ත්‍රිකෝණමිතිය, දෛශික\n• Online Live & HD Recordings සහිතයි',
    (select id from public.classes where id = '3dc18520-ebb2-49f2-8efd-e74ff688e82b'),
    false, true, 110
  ),
  (
    'a1280002-0000-4000-8000-000000000002',
    2028, 'Paper Class', '2028 A/L Combined Maths - Paper Class',
    'Panadura', 'සක්යා (Sakya) · පානදුර',
    'ඉරිදා / බදාදා', 'ඉරිදා 12.00 – 2.00 / බදාදා 2.30 – 5.00',
    'LKR 2,000 / මසකට', 'ඕනෑම පැය 2ක් පැමිණ ලියන්න',
    E'• ප්‍රශ්න පත්‍ර සාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom\n• Recordings LMS තුළ ඇත',
    (select id from public.classes where id = '82566b86-a2b3-4202-aa17-49a057a4e3ce'),
    false, true, 120
  ),
  (
    'a1280003-0000-4000-8000-000000000003',
    2028, 'Paper Class', '2028 A/L Combined Maths - Paper Class',
    'Kalutara', 'රසන්යා (Rasanya) · කළුතර',
    'ඉරිදා / බ්‍රහස්පතින්දා', 'ඉරිදා 11.30 – 1.30 / බ්‍රහස්පතින්දා 2.30 – 5.00',
    'LKR 2,000 / මසකට', 'ඕනෑම පැය 2ක් පැමිණ ලියන්න',
    E'• ප්‍රශ්න පත්‍ර සාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom',
    (select id from public.classes where id = '82566b86-a2b3-4202-aa17-49a057a4e3ce'),
    false, true, 130
  ),
  (
    'a1280004-0000-4000-8000-000000000004',
    2028, 'Paper Class', '2028 A/L Combined Maths - Paper Class',
    'Horana', 'විදුල (Vidula) · හොරණ',
    'බදාදා / සිකුරාදා', 'ප.ව. 2.30 – 5.00',
    'LKR 2,000 / මසකට', 'ඕනෑම පැය 2ක් පැමිණ ලියන්න',
    E'• ප්‍රශ්න පත්‍ර සාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom',
    (select id from public.classes where id = '82566b86-a2b3-4202-aa17-49a057a4e3ce'),
    false, true, 140
  ),
  (
    'a1280005-0000-4000-8000-000000000005',
    2028, 'Paper Class', '2028 A/L Combined Maths - Paper Class',
    'Mathugama', 'පැනෝලා (Panola) · මතුගම',
    'සඳුදා / සෙනසුරාදා', 'සඳුදා 2.30 – 5.00 / සෙනසුරාදා 8.30 – 10.30',
    'LKR 2,000 / මසකට', 'ඕනෑම පැය 2ක් පැමිණ ලියන්න',
    E'• ප්‍රශ්න පත්‍ර සාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom',
    (select id from public.classes where id = '82566b86-a2b3-4202-aa17-49a057a4e3ce'),
    false, true, 150
  ),

  -- 2027 A/L Active Classes
  (
    'a1270001-0000-4000-8000-000000000001',
    2027, 'Theory', '2027 A/L Combined Maths - Theory',
    'Panadura', 'සක්යා (Sakya) · පානදුර',
    'සඳුදා / Monday', 'ප.ව. 3.00 – 6.30',
    'LKR 3,500 / මසකට', 'Online Live & Recordings සහිතයි',
    E'• හොරණ විදුල: බ්‍රහස්පතින්දා ප.ව. 3.30 – 6.30\n• කළුතර රසන්යා: සෙනසුරාදා ප.ව. 2.00 – 5.00\n• මතුගම පැනෝලා: ඉරිදා පෙ.ව. 11.00 – ප.ව. 2.00',
    (select id from public.classes where id = '874143e4-0e17-4462-a755-e051bf9db22e'),
    false, true, 210
  ),
  (
    'a1270002-0000-4000-8000-000000000002',
    2027, 'Revision', '2027 A/L Combined Maths - Revision',
    'Panadura', 'සක්යා (Sakya) · පානදුර & Online',
    'බදාදා / Wednesday', 'පෙ.ව. 8.00 – 1.30',
    'LKR 3,500 / මසකට', 'Revision + Paper Full Pack (Rs. 4,500)',
    E'• මතුගම පැනෝලා: සඳුදා පෙ.ව. 8.00 – 1.30\n• හොරණ විදුල: අඟහරුවාදා පෙ.ව. 8.00 – 1.30\n• කළුතර රසන්යා: බ්‍රහස්පතින්දා පෙ.ව. 8.00 – 1.30',
    (select id from public.classes where id = '63c4d864-e393-41e5-b1a8-21276d25a366'),
    false, true, 220
  ),
  (
    'a1270003-0000-4000-8000-000000000003',
    2027, 'Paper Class', '2027 A/L Combined Maths - Paper Class',
    'Panadura', 'සක්යා (Sakya) · පානදුර & Online',
    'බදාදා / Wednesday', 'ප.ව. 2.30 – 5.00',
    'LKR 2,000 / මසකට', 'Full Pack (Theory+Revision+Paper) Rs. 5,500',
    E'• මතුගම පැනෝලා: සඳුදා ප.ව. 2.30 – 5.00\n• හොරණ විදුල: අඟහරුවාදා ප.ව. 2.30 – 5.00\n• කළුතර රසන්යා: බ්‍රහස්පතින්දා ප.ව. 2.30 – 5.00',
    (select id from public.classes where id = '6e630bbd-080a-4c9b-8566-a1e5702e8685'),
    false, true, 230
  )
on conflict (id) do nothing;

-- Ensure existing class descriptions also use මඳුසංක (සඤ්ඤක ඳ)
update public.classes
   set description = replace(replace(description, 'මධුසංක', 'මඳුසංක'), 'මදුසංක', 'මඳුසංක')
 where description like '%මධුසංක%' or description like '%මදුසංක%';
