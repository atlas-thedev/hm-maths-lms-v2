-- ════════════════════════════════════════════════════════════════════════════
-- HM Maths LMS · 0034 — Grouped Class Cards with Multi-Center Slots
-- One card per class (2029 Theory, 2028 Theory/Paper, 2027 Theory/Rev/Paper)
-- containing all physical centers + Online neatly inside `slots` JSONB,
-- with zero redundant per-center duplicate cards or description walls.
-- Safe & idempotent on repeated deploys (never overwrites user-edited rows).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.timetable_entries
  add column if not exists slots jsonb not null default '[]'::jsonb;

-- Remove redundant split-center seed rows from 0033 only if still untouched
delete from public.timetable_entries
 where id in (
   'a1290002-0000-4000-8000-000000000002',
   'a1290003-0000-4000-8000-000000000003',
   'a1290004-0000-4000-8000-000000000004',
   'a1290005-0000-4000-8000-000000000005',
   'a1290006-0000-4000-8000-000000000006',
   'a1280003-0000-4000-8000-000000000003',
   'a1280004-0000-4000-8000-000000000004',
   'a1280005-0000-4000-8000-000000000005'
 )
   and slots = '[]'::jsonb;

-- 2029 A/L Combined Maths - Theory (one card covering all institutes + Online)
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'නව කණ්ඩායම් ලියාපදිංචිය දැන් ඇරඹේ',
       fee_label  = 'පළමු දින නොමිලේ',
       slots = '[
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"සෙනසුරාදා / Sat","time_label":"පෙ.ව. 8.00 – 11.30"},
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"ඉරිදා / Sun","time_label":"පෙ.ව. 8.00 – 11.30"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"සිකුරාදා / Fri","time_label":"ප.ව. 2.30 – 5.30"},
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"බදාදා / Wed","time_label":"ප.ව. 2.30 – 5.30"},
         {"center_key":"Online","hall_name":"Zoom Live + HD Recordings","day_label":"සෙනසුරාදා / Sat","time_label":"ප.ව. 6.30 – 9.30"}
       ]'::jsonb
 where id = 'a1290001-0000-4000-8000-000000000001'
   and slots = '[]'::jsonb;

-- 2028 A/L Combined Maths - Theory
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'Online Live & HD Recordings සහිතයි',
       fee_label  = 'LKR 3,600 / මසකට',
       slots = '[
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"අඟහරුවාදා","time_label":"ප.ව. 3.30 – 6.30"},
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"සෙනසුරාදා","time_label":"පෙ.ව. 10.30 – ප.ව. 1.30"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"ඉරිදා","time_label":"පෙ.ව. 8.00 – 11.00"},
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"ඉරිදා","time_label":"ප.ව. 2.30 – 6.00"},
         {"center_key":"Online","hall_name":"Zoom Live + HD Recordings","day_label":"ඉරිදා","time_label":"ප.ව. 2.30 – 6.00"}
       ]'::jsonb
 where id = 'a1280001-0000-4000-8000-000000000001'
   and slots = '[]'::jsonb;

-- 2028 A/L Combined Maths - Paper Class
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'ඕනෑම පැය 2ක් පැමිණ ලියන්න · සාකච්ඡාව ඉරිදා ප.ව. 6.30 Online',
       fee_label  = 'LKR 2,000 / මසකට',
       slots = '[
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"ඉරිදා / බදාදා","time_label":"12.00 – 2.00 / 2.30 – 5.00"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"ඉරිදා / බ්‍රහස්.","time_label":"11.30 – 1.30 / 2.30 – 5.00"},
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"බදාදා / සිකුරාදා","time_label":"ප.ව. 2.30 – 5.00"},
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"සඳුදා / සෙන.","time_label":"2.30 – 5.00 / 8.30 – 10.30"},
         {"center_key":"Online","hall_name":"Zoom සාකච්ඡාව","day_label":"ඉරිදා","time_label":"ප.ව. 6.30 – 8.30"}
       ]'::jsonb
 where id = 'a1280002-0000-4000-8000-000000000002'
   and slots = '[]'::jsonb;

-- 2027 A/L Combined Maths - Theory
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'Online Live & HD Recordings සහිතයි',
       fee_label  = 'LKR 3,500 / මසකට',
       slots = '[
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"සඳුදා","time_label":"ප.ව. 3.00 – 6.30"},
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"බ්‍රහස්පතින්දා","time_label":"ප.ව. 3.30 – 6.30"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"සෙනසුරාදා","time_label":"ප.ව. 2.00 – 5.00"},
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"ඉරිදා","time_label":"පෙ.ව. 11.00 – ප.ව. 2.00"}
       ]'::jsonb
 where id = 'a1270001-0000-4000-8000-000000000001'
   and slots = '[]'::jsonb;

-- 2027 A/L Combined Maths - Revision
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'Revision + Paper Pack: LKR 4,500',
       fee_label  = 'LKR 3,500 / මසකට',
       slots = '[
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"සඳුදා","time_label":"පෙ.ව. 8.00 – 1.30"},
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"අඟහරුවාදා","time_label":"පෙ.ව. 8.00 – 1.30"},
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"බදාදා","time_label":"පෙ.ව. 8.00 – 1.30"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"බ්‍රහස්පතින්දා","time_label":"පෙ.ව. 8.00 – 1.30"},
         {"center_key":"Online","hall_name":"Zoom Live + HD","day_label":"බදාදා","time_label":"පෙ.ව. 8.00 – 1.30"}
       ]'::jsonb
 where id = 'a1270002-0000-4000-8000-000000000002'
   and slots = '[]'::jsonb;

-- 2027 A/L Combined Maths - Paper Class
update public.timetable_entries
   set hall_name  = 'සියලු මධ්‍යස්ථාන සහ Online',
       details    = '',
       start_note = 'Full Pack (Theory+Revision+Paper): LKR 5,500',
       fee_label  = 'LKR 2,000 / මසකට',
       slots = '[
         {"center_key":"Mathugama","hall_name":"පැනෝලා (Panola)","day_label":"සඳුදා","time_label":"ප.ව. 2.30 – 5.00"},
         {"center_key":"Horana","hall_name":"විදුල (Vidula)","day_label":"අඟහරුවාදා","time_label":"ප.ව. 2.30 – 5.00"},
         {"center_key":"Panadura","hall_name":"සක්යා (Sakya)","day_label":"බදාදා","time_label":"ප.ව. 2.30 – 5.00"},
         {"center_key":"Kalutara","hall_name":"රසන්යා (Rasanya)","day_label":"බ්‍රහස්පතින්දා","time_label":"ප.ව. 2.30 – 5.00"},
         {"center_key":"Online","hall_name":"Zoom + Recordings","day_label":"බදාදා","time_label":"ප.ව. 2.30 – 5.00"}
       ]'::jsonb
 where id = 'a1270003-0000-4000-8000-000000000003'
   and slots = '[]'::jsonb;

-- Clean default hero_promo subtitle if still set to the 0033 multi-town description
update public.system_settings
   set value = value || '{"subtitleEn":"","subtitleSi":""}'::jsonb
 where key = 'hero_promo'
   and value->>'subtitleSi' like '%සම්පූර්ණ විස්තර%';
