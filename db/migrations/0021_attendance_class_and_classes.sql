-- Migration 0021: Class Attendance Unique Index & Master Classes Seed
-- Safe to re-run.

-- 1. Update attendance unique constraint so students can attend multiple classes on the same day
alter table public.attendance drop constraint if exists attendance_student_id_day_key;
drop index if exists public.attendance_student_day_class_uniq;
create unique index if not exists attendance_student_day_class_uniq
  on public.attendance (student_id, day, coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 2. Insert or update the 8 master classes with complete schedules and fees
insert into public.classes (title, class_type, target_year, town, fee, schedule, description, is_active, is_free)
values
  (
    '2027 A/L Combined Maths - Theory',
    'Theory',
    2027,
    'Online',
    3500.00,
    'පානදුර (සඳුදා) | හොරණ (බ්‍රහස්) | කළුතර (සෙන) | මතුගම (ඉරිදා) + Online',
    'හසිත මධුසංක සර්ගේ 2027 A/L Combined Maths Theory පන්තිය.

පන්ති කාලසටහන:
• සක්යා - පානදුර: සඳුදා ප.ව. 3.00 – 6.30
• විදුල - හොරණ: බ්‍රහස්පතින්දා ප.ව. 3.30 – 6.30
• රසන්‍යා - කළුතර: සෙනසුරාදා ප.ව. 2.00 – 5.00
• පැනෝලා - මතුගම: ඉරිදා පෙ.ව. 11.00 – ප.ව. 2.00
• Online Live & Recordings',
    true,
    false
  ),
  (
    '2027 A/L Combined Maths - Revision',
    'Revision',
    2027,
    'Online',
    3500.00,
    'මතුගම (සඳුදා) | හොරණ (අඟහ) | පානදුර (බදාදා) | කළුතර (බ්‍රහස්) + Online',
    '2027 A/L Combined Maths Revision පන්තිය.

පන්ති කාලසටහන:
• පැනෝලා - මතුගම: සඳුදා පෙ.ව. 8.00 – 1.30
• විදුල - හොරණ: අඟහරුවාදා පෙ.ව. 8.00 – 1.30
• සක්යා - පානදුර & ONLINE: බදාදා පෙ.ව. 8.00 – 1.30
• රසන්‍යා - කළුතර: බ්‍රහස්පතින්දා පෙ.ව. 8.00 – 1.30
• Online Live & Recordings',
    true,
    false
  ),
  (
    '2027 A/L Combined Maths - Paper Class',
    'Paper Class',
    2027,
    'Online',
    2000.00,
    'මතුගම (සඳුදා) | හොරණ (අඟහ) | පානදුර (බදාදා) | කළුතර (බ්‍රහස්) + Online',
    '2027 A/L Combined Maths Paper Class එක.

පන්ති කාලසටහන:
• පැනෝලා - මතුගම: සඳුදා ප.ව. 2.30 – 5.00
• විදුල - හොරණ: අඟහරුවාදා ප.ව. 2.30 – 5.00
• සක්යා - පානදුර & ONLINE: බදාදා ප.ව. 2.30 – 5.00
• රසන්‍යා - කළුතර: බ්‍රහස්පතින්දා ප.ව. 2.30 – 5.00
• Online Discussions & Recordings',
    true,
    false
  ),
  (
    '2027 A/L Combined Maths - Revision + Paper Class',
    'Revision',
    2027,
    'Online',
    4500.00,
    'Revision (පෙ.ව. 8.00 - 1.30) + Paper Class (ප.ව. 2.30 - 5.00)',
    'Revision + Paper Class පන්ති දෙකම සඳහා වන Combo Package එක.
(නවක සිසුන්: Rs. 4,500/- | පළමු වර සර්ගේ පන්ති ආ 2nd shy සිසුන්: Rs. 3,500/- | 3rd shy සිසුන්: Rs. 2,000/-)

• පැනෝලා - මතුගම: සඳුදා
• විදුල - හොරණ: අඟහරුවාදා
• සක්යා - පානදුර & ONLINE: බදාදා
• රසන්‍යා - කළුතර: බ්‍රහස්පතින්දා',
    true,
    false
  ),
  (
    '2027 A/L Combined Maths - Full Pack (Theory + Revision + Paper)',
    'Revision',
    2027,
    'Online',
    5500.00,
    'Theory + Revision + Paper Class තුනම (Full Pack)',
    '2027 A/L Theory, Revision, සහ Paper Class යන පන්ති තුනම ඇතුළත් සම්පූර්ණ Combined Maths පැකේජය. (ගාස්තුව: Rs. 5,500/-)',
    true,
    false
  ),
  (
    '2028 A/L Combined Maths - Theory',
    'Theory',
    2028,
    'Online',
    3600.00,
    'හොරණ (අඟහ) | මතුගම (සෙන) | කළුතර (ඉරිදා) | පානදුර (ඉරිදා) + Online',
    'හසිත මධුසංක සර්ගේ 2028 A/L Combined Maths Theory පන්තිය.

පන්ති කාලසටහන:
• විදුල - හොරණ: අඟහරුවාදා ප.ව. 3.30 – 6.30
• පැනෝලා - මතුගම: සෙනසුරාදා පෙ.ව. 10.30 – ප.ව. 1.30
• රසන්‍යා - කළුතර: ඉරිදා පෙ.ව. 8.00 – 11.00
• සක්යා - පානදුර & ONLINE: ඉරිදා ප.ව. 2.30 – 6.00',
    true,
    false
  ),
  (
    '2028 A/L Combined Maths - Paper Class',
    'Paper Class',
    2028,
    'Online',
    2000.00,
    'Online Zoom සාකච්ඡාව ඉරිදා ප.ව. 6.30 | ලිවීම: පානදුර, කළුතර, හොරණ, මතුගම',
    '2028 A/L Combined Maths Paper Class එක.

සාකච්ඡාව: ඉරිදා ප.ව. 6.30 Online Zoom හරහා (Recordings සහිතයි).
ඕනෑම පැය 2ක් පැමිණ ප්‍රශ්න පත්‍රය ලියන්න:
• සක්යා - පානදුර: ඉරිදා 12.00 – 2.00 / බදාදා 2.30 – 5.00
• රසන්‍යා - කළුතර: ඉරිදා 11.30 – 1.30 / බ්‍රහස්පතින්දා 2.30 – 5.00
• විදුල - හොරණ: බදාදා 2.30 – 5.00 / සිකුරාදා 2.30 – 5.00
• පැනෝලා - මතුගම: සඳුදා 2.30 – 5.00 / සෙනසුරාදා 8.30 – 10.30',
    true,
    false
  ),
  (
    '2028 A/L Combined Maths - Theory + Paper Class',
    'Theory',
    2028,
    'Online',
    4600.00,
    'Theory + Paper Class දෙකම',
    '2028 A/L Theory සහ Paper Class පන්ති දෙකම ඇතුළත් පැකේජය.',
    true,
    false
  )
on conflict do nothing;
