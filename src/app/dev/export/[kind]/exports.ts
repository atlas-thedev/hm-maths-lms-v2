/** CSV exports offered in Developer panel → Tools. Queries run with full access, so keep them read-only. */
export const EXPORTS: Record<string, { title: string; description: string; file: string; sql: string }> = {
  students: {
    title: "Students", description: "Every student with contact details, batch and center", file: "students",
    sql: `select p.student_id, p.full_name, p.mobile, p.whatsapp, p.guardian_mobile, p.nic, p.al_year, p.attempt, p.town as center,
                 p.school, p.district, p.address, p.city, p.postal_code, p.created_at
            from public.profiles p where p.role = 'student' order by p.created_at`,
  },
  enrollments: {
    title: "Class payments (slips)", description: "All class enrollments with status, amount and reviewer", file: "class-payments",
    sql: `select e.created_at, p.student_id, p.full_name, c.title as class, e.month, e.status, e.amount, e.bank_ref, e.admin_note,
                 r.full_name as reviewed_by, e.reviewed_at
            from public.enrollments e join public.profiles p on p.id = e.student_id join public.classes c on c.id = e.class_id
            left join public.profiles r on r.id = e.reviewed_by order by e.created_at desc`,
  },
  orders: {
    title: "Tute orders", description: "Store orders with delivery address and status", file: "tute-orders",
    sql: `select o.created_at, p.student_id, p.full_name, p.mobile, pr.title as item, o.quantity, o.amount, o.status, o.delivery_address, o.admin_note
            from public.orders o join public.profiles p on p.id = o.student_id join public.products pr on pr.id = o.product_id order by o.created_at desc`,
  },
  marks: {
    title: "Paper marks", description: "Every mark entered, per paper and student", file: "paper-marks",
    sql: `select pa.paper_date, pa.title as paper, pa.total_marks, p.student_id, p.full_name, p.town as center, m.marks, round(100.0 * m.marks / nullif(pa.total_marks, 0), 1) as percent, m.remark
            from public.paper_marks m join public.papers pa on pa.id = m.paper_id join public.profiles p on p.id = m.student_id order by pa.paper_date desc, m.marks desc`,
  },
  attendance: {
    title: "Attendance", description: "QR / manual attendance records", file: "attendance",
    sql: `select a.day, a.scanned_at, p.student_id, p.full_name, p.town as center, c.title as class, a.method
            from public.attendance a join public.profiles p on p.id = a.student_id left join public.classes c on c.id = a.class_id order by a.scanned_at desc`,
  },
  activity: {
    title: "Activity log", description: "Staff & developer actions", file: "activity-log",
    sql: `select created_at, actor_name, actor_role, category, action, student_name, student_code, summary from public.admin_audit_logs order by created_at desc`,
  },
};
