-- One-time import of user-supplied 2025 posters. Review drafts before publishing:
-- some names/schools are hard to read, and the first poster's 2.5971 name differs
-- from the third poster. Do not merge records based solely on Z-score.
-- The marker makes reruns safe: editing or deleting a result will not recreate it.
-- Existing matching names or index numbers are left untouched.
with seeded as (
  insert into public.system_settings (key, value)
  values ('seed_results_2025_posters_v1', '{"source":"2025 posters","status":"review"}'::jsonb)
  on conflict (key) do nothing returning key
), source (ord, name, exam_number, grades, distinction, photo_url) as (
  values
    (1, 'සෙනිතු සිල්වා', '', 'Combined Maths: A · Z-score 1.5179 · Kalutara District 153', '', ''),
    (2, 'ලසිරු නදීශාන්', '', 'Combined Maths: A · Z-score 1.418', '', ''),
    (3, 'රවිමි අල්විස්', '', 'Combined Maths: A · Z-score 1.4034', '', ''),
    (4, 'පසිඳි නිකේෂලා', '', 'Combined Maths: A · Z-score 1.7715', '', ''),
    (5, 'සෙනුරි සන්දීපා', '', 'Combined Maths: A · Z-score 1.609 · Kalutara District 122', '', ''),
    (6, 'ගයත්‍රී මුණසිංහ', '', 'Combined Maths: A · Z-score 1.5106 · Kalutara District 159', '', ''),
    (7, 'සදලි පාරා', '', 'Combined Maths: A · Z-score 1.4221', '', ''),
    (8, 'කවීෂ සංජාන', '8246483', 'Combined Maths: A · Z-score 2.6043', 'Maths + ICT · ඉහළම Z-score', '/images/results-2025/maths-ict.webp'),
    (9, 'රවිදු අශාන්', '', 'Combined Maths: A · Z-score 1.686 · Kalutara District 116', '', ''),
    (10, 'විශ්ව කුලන්ත', '', 'Combined Maths: A · Z-score 2.1613', '', ''),
    (11, 'චන්දුල දෙනුවන්', '', 'Combined Maths: A · Z-score 1.4662 · Kalutara District 177', '', ''),
    (12, 'සවින් දිල්ෂාන්', '', 'Combined Maths: A · Z-score 1.5284 · Kalutara District 151', '', ''),
    (13, 'ආදිත්‍ය කරුණාරත්න', '', 'Combined Maths: A · Z-score 2.5971', '', ''),
    (14, 'ප්‍රමේෂ් ධනංජය', '', 'Combined Maths: A · Z-score 1.335', '', ''),
    (15, 'වාලක සේමගේ', '', 'Combined Maths: A · Z-score 1.2808', '', ''),
    (16, 'දෙනෙත් ඥානුක', '8243352', 'Combined Maths: A · Z-score 2.6369', 'Kalutara District 02', '/images/results-2025/district-02.webp'),
    (17, 'සුසත් සන්දිල', '', 'Combined Maths: A · Z-score 1.5968 · Kalutara District 125', '', ''),
    (18, 'ඉසුරි වත්සලා', '', 'Combined Maths: A · Z-score 1.54 · Kalutara District 147', '', ''),
    (19, 'සපිනි ප්‍රභාෂි', '', 'Combined Maths: A · Z-score 1.7213 · Kalutara District 91', '', ''),
    (20, 'සාවින්දි දිසානායක', '', 'Combined Maths: A · Z-score 1.7658 · Kalutara District 73', '', ''),
    (21, 'දෙව්මිණි බිනෝදා', '', 'Combined Maths: A · Z-score 1.8291 · Kalutara District 63', '', ''),
    (22, 'පවිදු තීක්ෂණ', '8288674', 'Combined Maths: A · Z-score 2.2786', 'Kalutara District 12', '/images/results-2025/district-12.webp'),
    (23, 'හංසිකා දෙව්මිණි', '', 'Combined Maths: B · Z-score 1.9534 · Kalutara District 46', '', ''),
    (24, 'සෙනිතු නෙත්සර', '', 'Combined Maths: B · Z-score 1.1856', '', ''),
    (25, 'පැතුම් සම්පත්', '', 'Combined Maths: B · Z-score 0.7655', '', ''),
    (26, 'තරිඳු දම්මික', '', 'Combined Maths: B · Z-score 1.5424 · Kalutara District 143', '', ''),
    (27, 'නිසල් ද සිල්වා', '', 'Combined Maths: B · Z-score 1.2764', '', ''),
    (28, 'රසිත් සෙහාන්', '', 'Combined Maths: B · Z-score 1.3359', '', ''),
    (29, 'නිපුන් මදූෂ', '', 'Combined Maths: B · Z-score 1.8317', '', ''),
    (30, 'නෙත්මි නවෝද්‍යා', '', 'Combined Maths: B · Z-score 0.9954', '', ''),
    (31, 'හෂිණි අමාෂා', '', 'Combined Maths: B · Z-score 1.5407 · Kalutara District 145', '', ''),
    (32, 'සිතුමිණි සවිද්‍යා', '', 'Combined Maths: B · Z-score 1.6186 · Kalutara District 118', '', ''),
    (33, 'තිරණි කෞෂල්‍යා', '', 'Combined Maths: B · Z-score 0.6088', '', ''),
    (34, 'දනුලි තිරන්දනා', '', 'Combined Maths: B · Z-score 1.6266', '', ''),
    (35, 'ගගනි අනුත්තරා', '', 'Combined Maths: B · Z-score 1.3952', '', ''),
    (36, 'සසිඳු සඳමිණ', '', 'Combined Maths: B · Z-score 1.3127', '', ''),
    (37, 'සන්දීප මදුශාන්', '', 'Combined Maths: B · Z-score 1.6946', '', ''),
    (38, 'හසිදු අභිෂේක', '', 'Combined Maths: B · Z-score 1.9023', '', ''),
    (39, 'යොගීත් චතුර', '', 'Combined Maths: B · Z-score 0.7709', '', ''),
    (40, 'ලෙසත් නිම්තක', '', 'Combined Maths: B · Z-score 1.4766 · Kalutara District 173', '', ''),
    (41, 'දුවිඳු සවින්ත', '', 'Combined Maths: B · Z-score 0.7723', '', ''),
    (42, 'රවිත් රන්දුල', '', 'Combined Maths: B · Z-score 1.0226', '', ''),
    (43, 'විශ්ව වින්දන', '', 'Combined Maths: B · Z-score 1.3066', '', ''),
    (44, 'නවිදු ලක්ෂාන්', '', 'Combined Maths: B · Z-score 1.5142', '', ''),
    (45, 'විහඟ සන්දීප', '', 'Combined Maths: B · Z-score 1.5457', '', ''),
    (46, 'පෙසත් රතිෂ', '', 'Combined Maths: B · Z-score 1.7332 · Kalutara District 84', '', ''),
    (47, 'නදුනි නවීසා', '', 'Combined Maths: B · Z-score 1.0341', '', ''),
    (48, 'තෙසාරා චන්මිණි', '', 'Combined Maths: B · Z-score 1.3374', '', ''),
    (49, 'මල්මි නිකේෂලා', '', 'Combined Maths: B · Z-score 1.0939', '', ''),
    (50, 'මහීමා මෙත්තානි', '', 'Combined Maths: B · Z-score 0.6903', '', ''),
    (51, 'සදනි හංසිකා', '', 'Combined Maths: B · Z-score 1.3886', '', ''),
    (52, 'නෝෂි ඉමායා', '', 'Combined Maths: B · Z-score 1.7082 · Kalutara District 96', '', ''),
    (53, 'යුගීත්මා සෙහෙන්දි', '', 'Combined Maths: B · Z-score 1.023', '', ''),
    (54, 'සෙසදි මෙතුලිමා', '', 'Combined Maths: B · Z-score 1.1211', '', ''),
    (55, 'නෙනිමි ප්‍රාර්ථනා', '', 'Combined Maths: B · Z-score 1.3832', '', ''),
    (56, 'නදුන් ගිම්හාන', '', 'Combined Maths: B · Z-score 0.9937', '', ''),
    (57, 'වමත් ආදිත්‍ය', '8243719', 'Z-score 2.5971', 'Kalutara District 04', '/images/results-2025/district-04.webp')
)
insert into public.student_results (name, exam_year, exam_number, grades, distinction, photo_url, is_published, created_at)
select s.name, 2025, s.exam_number, s.grades, s.distinction, s.photo_url, false,
       now() - (s.ord * interval '1 second')
  from source s cross join seeded
 where not exists (
   select 1 from public.student_results existing
    where existing.exam_year = 2025
      and ((s.exam_number <> '' and existing.exam_number = s.exam_number) or existing.name = s.name)
 );
