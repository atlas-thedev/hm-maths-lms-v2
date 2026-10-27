import type { ClassType, NoticeTag, Town } from "./constants";

export type Role = "student" | "admin" | "owner" | "developer";
export type EnrollmentStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  mobile: string | null;
  nic: string | null;
  al_year: number | null;
  /** 1st / 2nd / 3rd A/L attempt. */
  attempt: 1 | 2 | 3;
  whatsapp: string | null;
  guardian_mobile: string | null;
  /** Object path in the private "avatars" bucket. */
  avatar_path: string | null;
  /** Optional e-mail where a Forgot-password code can be sent. */
  recovery_email?: string | null;
  notices_seen_at?: string | null;
  town: Town;
  school: string | null;
  district: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  student_id: string | null;
  role: Role;
  created_at: string;
}

export interface ClassRow {
  id: string;
  title: string;
  description: string | null;
  class_type: ClassType;
  target_year: number | null;
  town: Town | null;
  fee: number;
  schedule: string | null;
  /** Weekly class days, 0 = Sunday … 6 = Saturday. */
  schedule_days: number[];
  /** "HH:MM:SS" Sri Lanka time, or null. */
  start_time: string | null;
  duration_minutes: number;
  banner_url: string | null;
  banner_config: import("./banner").BannerConfig | null;
  is_active: boolean;
  is_free: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  class_id: string;
  month: string;
  week_number: number;
  title: string;
  description: string | null;
  youtube_url: string | null;
  tute_pdf_url: string | null;
  live_start_time: string | null;
  session_type: "regular" | "extra";
  duration_minutes: number | null;
  is_cancelled: boolean;
  sort_order: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  month: string;
  status: EnrollmentStatus;
  slip_url: string | null;
  amount: number | null;
  bank_ref: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type NotificationKind = "payment_approved" | "payment_rejected" | "order_approved" | "order_rejected" | "order_shipped" | "update";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string | null;
  body: string | null;
  link: string | null;
  data: { class?: string; month?: string; product?: string; note?: string | null } & Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  online_url: string | null;
  poster_url: string | null;
  class_id: string | null;
  target_year: number | null;
  is_published: boolean;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  tag: NoticeTag;
  is_pinned: boolean;
  class_id: string | null;
  target_year: number | null;
  created_at: string;
}

export interface Exam {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  exam_type: "mcq" | "structured";
  duration_minutes: number;
  total_questions: number;
  paper_pdf_url: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_published: boolean;
  created_at: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  options_json: string[];
  correct_answer: number;
  marks: number;
  explanation: string | null;
  sort_order: number;
}

export interface ExamSubmission {
  id: string;
  student_id: string;
  exam_id: string;
  score: number | null;
  total_marks: number | null;
  answers_json: Record<string, number>;
  answer_sheet_urls: string[];
  status: "in_progress" | "submitted" | "graded";
  is_late: boolean;
  feedback: string | null;
  started_at: string;
  submitted_at: string | null;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  product_type: "tute_book" | "other";
  price: number;
  image_url: string | null;
  is_active: boolean;
}

export interface Order {
  id: string;
  student_id: string;
  product_id: string;
  quantity: number;
  amount: number | null;
  delivery_address: string;
  status: "pending" | "approved" | "rejected" | "shipped";
  slip_url: string | null;
  admin_note: string | null;
  created_at: string;
}

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string>; data?: Record<string, string> } | null;
