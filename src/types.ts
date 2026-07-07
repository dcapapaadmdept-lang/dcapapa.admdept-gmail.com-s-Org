export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Senior Pastor'
  | 'Church Administrator'
  | 'Care Pastor'
  | 'Satellite Church Admin'
  | 'satellite_admin'
  | 'Satellite Admin'
  | 'Department Head'
  | 'Finance Officer'
  | 'Member'
  | 'Care Center Admin'
  | 'Care Center Administrator'
  | 'CMD'
  | 'Church Ministry Director';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string; // Links to departments
  care_center_id?: string; // Links to care_centers
  satellite_church_id?: string; // Links to satellite_churches
  assigned_cmd_name?: string; // Assigned CMD Name for Church Ministry Directors
  created_at: string;
  status?: 'Active' | 'Suspended' | 'Pending';
}

export interface Member {
  id: string; // UUID or string
  member_id: string; // DCC-XXXX-XX custom member ID
  names: string;
  phone_number: string;
  address: string;
  gender: 'Male' | 'Female';
  marital_status: 'Single' | 'Married' | 'Widowed' | 'Divorced';
  dob: string; // YYYY-MM-DD
  join_date: string; // YYYY-MM-DD
  care_center_id?: string | null; // link to care_centers
  satellite_church_id?: string | null; // link to satellite_churches
  department_id?: string | null; // link to departments
  email: string;
  photo_url?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  created_at: string;

  // New fields for Master People Directory and Leaders & Workers
  person_type?: 'Member' | 'Leader & Worker';
  leadership_position?: string;
  ministry_department?: string;
  worker_since?: string;
  leadership_status?: string;
  reporting_pastor?: string;
  service_unit?: string;
}

export interface SchemaField {
  key: keyof Member | string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'relation_dept' | 'relation_cmd' | 'relation_sat' | 'system' | 'custom';
  nullable: boolean;
  required: boolean;
  options?: string[];
}

export const MEMBER_SCHEMA: SchemaField[] = [
  { key: 'id', label: 'UUID', type: 'system', nullable: false, required: false },
  { key: 'member_id', label: 'Member ID', type: 'system', nullable: false, required: false },
  { key: 'names', label: 'Full Names', type: 'text', nullable: false, required: true },
  { key: 'email', label: 'Email Address', type: 'email', nullable: true, required: false },
  { key: 'phone_number', label: 'Mobile Number', type: 'phone', nullable: true, required: false },
  { key: 'address', label: 'Home Address', type: 'text', nullable: true, required: false },
  { key: 'gender', label: 'Gender', type: 'select', nullable: false, required: true, options: ['Male', 'Female'] },
  { key: 'marital_status', label: 'Marital Status', type: 'select', nullable: false, required: true, options: ['Single', 'Married', 'Widowed', 'Divorced'] },
  { key: 'dob', label: 'Date of Birth', type: 'date', nullable: true, required: false },
  { key: 'join_date', label: 'Join Date', type: 'date', nullable: true, required: false },
  { key: 'department_id', label: 'Department Name', type: 'relation_dept', nullable: true, required: false },
  { key: 'care_center_id', label: 'Care Center Name', type: 'relation_cmd', nullable: true, required: false },
  { key: 'satellite_church_id', label: 'Satellite Church Name', type: 'relation_sat', nullable: true, required: false },
  { key: 'photo_url', label: 'Profile Photo URL', type: 'text', nullable: true, required: false },
  { key: 'status', label: 'Roster Status', type: 'select', nullable: false, required: true, options: ['Active', 'Inactive', 'Pending'] },
  { key: 'person_type', label: 'Person Type', type: 'select', nullable: false, required: true, options: ['Member', 'Leader & Worker'] },
  { key: 'leadership_position', label: 'Leadership Position', type: 'text', nullable: true, required: false },
  { key: 'ministry_department', label: 'Ministry/Department', type: 'text', nullable: true, required: false },
  { key: 'worker_since', label: 'Worker Since', type: 'date', nullable: true, required: false },
  { key: 'leadership_status', label: 'Leadership Status', type: 'select', nullable: true, required: false, options: ['Active', 'On Leave', 'Suspended', 'Retired'] },
  { key: 'reporting_pastor', label: 'Reporting Pastor', type: 'text', nullable: true, required: false },
  { key: 'service_unit', label: 'Service Unit', type: 'text', nullable: true, required: false },
  { key: 'created_at', label: 'Created At', type: 'system', nullable: false, required: false }
];

export interface Department {
  id: string;
  department_name: string;
  leader_id?: string; // Profile full name or id of leader
  assistant_leader_id?: string;
  created_at: string;
}

export interface CareCenter {
  id: string;
  cmd_name: string;
  care_pastor: string;
  cmd_address: string;
  leader_name: string;
  treasurer_name: string;
  email_address: string;
  created_at: string;
  care_center_name?: string;
  care_center_address?: string;
  satellite_church_id?: string;
}

export interface SatelliteChurch {
  id: string;
  church_name: string;
  church_loc: string;
  pastor_nam: string;
  admin_nam: string;
  treasurer_nam: string;
  created_at: string;
}

export interface MemberAttendance {
  id: string;
  member_id: string;
  attendance_date: string; // YYYY-MM-DD
  check_in_time: string; // HH:MM
  check_out_time?: string; // HH:MM
  attendance_type: 'Sunday Service' | 'Midweek Service' | 'Special Meeting' | 'Vigil';
  service_name: string;
  department_id?: string;
  care_center_id?: string;
  satellite_church_id?: string;
  created_by: string; // profile full_name or email
  created_at: string;
  service_type?: string;
  recorded_by?: string;
  member_name?: string;
}

export interface DepartmentAttendance {
  id: string;
  department_id: string;
  member_id: string;
  attendance_date: string; // YYYY-MM-DD
  attendance_time: string; // HH:MM
  attendance_status: 'Present' | 'Absent' | 'Excused';
  recorded_by: string; // Profile full_name
  created_at: string;
}

export interface CmdReport {
  id: string;
  cmd: string; // Name of CMD
  care_pastor: string;
  care_center_name: string;
  care_center_address: string;
  date_of_meeting: string; // YYYY-MM-DD
  report_week: string; // e.g. "Week 24"
  male: number;
  female: number;
  children: number;
  mvp_present: number;
  soul_won: number;
  offering_cash: number;
  offering_transfer: number;
  total_attendance: number; // calculated: male + female + children
  total_offering: number; // calculated: offering_cash + offering_transfer
  goals_next_meeting: string;
  treasurer_handling_cash: string;
  goals_achieved: 'Yes' | 'No' | 'Partially';
  email_address: string;
  created_by: string;
  created_at: string;
}

export interface SatelliteReport {
  id: string;
  satellite_church_id: string;
  church_name: string;
  church_loc: string;
  pastor_nam: string;
  admin_nam: string;
  service_date: string; // YYYY-MM-DD
  service_type: string; // e.g., Midweek, Sunday, Youth
  specify?: string;
  time_started: string;
  time_ended: string;
  male: number;
  female: number;
  children: number;
  online: number;
  mvp: number;
  souls: number;
  cash: number;
  transfer: number;
  total_attendance: number; // calculated: male + female + children + online
  total_income: number; // calculated: cash + transfer
  treasurer_nam: string;
  people_called_for_service: number;
  goal_for_next_midweek_service: string;
  created_by: string;
  created_at: string;
}

export interface StartupQueryTrace {
  queryName: string;
  tableName: string;
  durationMs: number | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  errorMessage: string | null;
}

export interface CareCenterReport {
  id: string; // UUID
  cmd: string;
  care_pastor: string;
  care_center_id: string;
  care_center_name: string;
  care_center_address: string;
  meeting_date: string; // YYYY-MM-DD
  report_week: string; // Week 1 to Week 5
  male: number;
  female: number;
  children: number;
  total_attendance: number; // Male + Female + Children
  mvp_present: number;
  soul_won: number;
  offering_cash: number;
  offering_transfer: number;
  total_offering: number; // Cash + Transfer
  goals_next_meeting: string;
  treasurer_name: string;
  goals_met: 'Yes' | 'No' | 'Partially';
  email_address: string;
  submitted_by: string; // logged-in user details
  created_at: string; // timestamp
}

export interface Finance {
  id: string;
  type: 'Income' | 'Expense';
  category_id?: string;
  amount: number;
  transaction_date: string;
  description?: string;
  recorded_by?: string;
  care_center_id?: string;
  satellite_church_id?: string;
  created_at?: string;
}

export interface LeaderWorkerAttendance {
  id: string;
  member_id: string; // references Member/Leader_Worker names or custom id
  meeting_type:
    | 'Leaders Meeting'
    | 'Workers Meeting'
    | 'Departmental Meeting'
    | 'Ministry Meeting'
    | 'Leadership Retreat'
    | 'Leadership Training'
    | 'Committee Meeting'
    | 'Emergency Meeting'
    | 'Special Leadership Events';
  meeting_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  attendance_status: 'Present' | 'Absent' | 'Excused';
  recorded_by: string; // Profile full_name or email
  satellite_church_id?: string | null;
  created_at: string;
}

