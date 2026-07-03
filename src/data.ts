import { Member, Department, CareCenter, SatelliteChurch, Profile, MemberAttendance, DepartmentAttendance, CmdReport, SatelliteReport, CareCenterReport } from './types';

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'dept-choir', department_name: 'Choir (Davidic Voice)', leader_id: 'Pastor Chidi Obi', assistant_leader_id: 'Sister Amanda Cole', created_at: '2025-01-10T12:00:00Z' },
  { id: 'dept-media', department_name: 'Media Unit', leader_id: 'Brother David Alao', assistant_leader_id: 'Brother Joshua Eme', created_at: '2025-01-12T12:00:00Z' },
  { id: 'dept-protocol', department_name: 'Protocol Team', leader_id: 'Sister Blessing Okon', assistant_leader_id: 'Brother Caleb Johnson', created_at: '2025-01-15T12:00:00Z' },
  { id: 'dept-technical', department_name: 'Technical Unit', leader_id: 'Brother Samuel Ade', assistant_leader_id: 'Brother Timothy Duke', created_at: '2025-01-18T12:00:00Z' },
  { id: 'dept-children', department_name: "Children's Church", leader_id: 'Pastor Mrs. Victoria Obi', assistant_leader_id: 'Sister Grace Edem', created_at: '2025-01-20T12:00:00Z' },
  { id: 'dept-ushering', department_name: 'Ushering Department', leader_id: 'Sister Deborah Nwachukwu', assistant_leader_id: 'Brother Gabriel Bassey', created_at: '2025-01-22T12:00:00Z' },
  { id: 'dept-followup', department_name: 'Follow-Up & Soul Winning', leader_id: 'Pastor John George', assistant_leader_id: 'Sister Ruth James', created_at: '2025-01-25T12:00:00Z' },
];

export const INITIAL_CARE_CENTERS: CareCenter[] = [
  { id: 'cmd-apapa', cmd_name: 'Apapa Central CMD', care_pastor: 'Pastor John George', cmd_address: '15, Wharf Road, Apapa, Lagos', leader_name: 'Brother Jude Agwu', treasurer_name: 'Sister Mary Ekong', email_address: 'apapa_central_cmd@dominioncity.org', created_at: '2025-02-01T10:00:00Z' },
  { id: 'cmd-surulere', cmd_name: 'Surulere Care Center', care_pastor: 'Pastor Lawrence Udoh', cmd_address: '42, Adeniran Ogunsanya Street, Surulere, Lagos', leader_name: 'Brother Stephen Paul', treasurer_name: 'Sister Rachel Benson', email_address: 'surulere_cmd@dominioncity.org', created_at: '2025-02-05T10:00:00Z' },
  { id: 'cmd-festac', cmd_name: 'Festac Care Center (CMD 3)', care_pastor: 'Pastor Kenneth Okafor', cmd_address: 'Block 2, 22 Road, Festac Town, Lagos', leader_name: 'Brother Emmanuel Ndu', treasurer_name: 'Sister Faith Uzo', email_address: 'festac_cmd3@dominioncity.org', created_at: '2025-02-10T10:00:00Z' },
  { id: 'cmd-ajegunle', cmd_name: 'Ajegunle Care Center', care_pastor: 'Pastor John George', cmd_address: '77, Baale Street, Ajegunle, Lagos', leader_name: 'Brother Kingsley Udoka', treasurer_name: 'Sister Janet Patrick', email_address: 'ajegunle_care@dominioncity.org', created_at: '2025-02-15T10:00:00Z' },
];

export const INITIAL_SATELLITE_CHURCHES: SatelliteChurch[] = [
  { id: 'sat-surulere', church_name: 'Dominion City Surulere Satellite', church_loc: '88, Bode Thomas Street, Surulere, Lagos', pastor_nam: 'Pastor Lawrence Udoh', admin_nam: 'Brother Daniel Peter', treasurer_nam: 'Sister Rachel Benson', created_at: '2025-02-01T09:00:00Z' },
  { id: 'sat-festac', church_name: 'Dominion City Festac Satellite', church_loc: '32, Festac Access Road, Festac Town, Lagos', pastor_nam: 'Pastor Kenneth Okafor', admin_nam: 'Sister Grace Okafor', treasurer_nam: 'Sister Faith Uzo', created_at: '2025-02-10T09:00:00Z' },
  { id: 'sat-ajegunle', church_name: 'Dominion City Ajegunle Satellite', church_loc: '104, Boundary Road, Ajegunle, Lagos', pastor_nam: 'Pastor Kingsley Udoka', admin_nam: 'Brother Silas Eze', treasurer_nam: 'Sister Monica Dan', created_at: '2025-02-28T09:00:00Z' },
  { id: 'sat-bethel', church_name: 'Bethel Satellite Church', church_loc: '12, Bethel Avenue, Apapa, Lagos', pastor_nam: 'Pastor Nwosu Michael', admin_nam: 'Nwosu Michael', treasurer_nam: 'Sister Mary Bethel', created_at: '2025-03-01T09:00:00Z' },
];

export const INITIAL_PROFILES: Profile[] = [
  { id: 'prof-admin', email: 'dcapapa.admdept@gmail.com', full_name: 'Pastor Peter Chidi (Super Admin)', role: 'Super Admin', created_at: '2025-01-01T08:00:00Z', status: 'Active' },
  { id: 'prof-pastor', email: 'seniorpastor@dominioncity.org', full_name: 'Senior Pastor David Obi', role: 'Senior Pastor', created_at: '2025-01-01T08:30:00Z', status: 'Active' },
  { id: 'prof-church-admin', email: 'churchadmin@dominioncity.org', full_name: 'Deaconess Sarah Peters', role: 'Church Administrator', created_at: '2025-01-01T09:00:00Z', status: 'Active' },
  { id: 'prof-care-pastor', email: 'carepastor@dominioncity.org', full_name: 'Pastor John George (Apapa Care)', role: 'Care Pastor', care_center_id: 'cmd-apapa', created_at: '2025-01-02T10:00:00Z', status: 'Active' },
  { id: 'prof-cmd', email: 'cmd@dominioncity.org', full_name: 'Pastor Kenneth Okafor (CMD Director)', role: 'CMD', assigned_cmd_name: 'Apapa Central CMD', satellite_church_id: 'sat-surulere', created_at: '2025-01-02T10:30:00Z', status: 'Active' },
  { id: 'prof-sat-admin', email: 'satadmin@dominioncity.org', full_name: 'Brother Daniel Peter (Surulere Satellite)', role: 'Satellite Church Admin', satellite_church_id: 'sat-surulere', created_at: '2025-01-02T11:00:00Z', status: 'Active' },
  { id: 'prof-nwosu-michael', email: 'nwosumichael@dominioncity.org', full_name: 'Nwosu Michael', role: 'Satellite Admin', satellite_church_id: 'sat-bethel', created_at: '2025-01-02T11:30:00Z', status: 'Active' },
  { id: 'prof-dept-head', email: 'depthead@dominioncity.org', full_name: 'Brother David Alao (Media Head)', role: 'Department Head', department_id: 'dept-media', created_at: '2025-01-02T12:00:00Z', status: 'Active' },
  { id: 'prof-finance', email: 'finance@dominioncity.org', full_name: 'Deacon Thomas Cole', role: 'Finance Officer', created_at: '2025-01-02T13:00:00Z', status: 'Active' },
  { id: 'prof-member', email: 'member@dominioncity.org', full_name: 'Brother Isaac Newton', role: 'Member', created_at: '2025-01-05T14:00:00Z', status: 'Active' },
  { id: 'prof-suspended', email: 'suspended@dominioncity.org', full_name: 'Suspended Worker Test', role: 'Department Head', department_id: 'dept-media', created_at: '2025-01-05T15:00:00Z', status: 'Suspended' },
  { id: 'prof-pending', email: 'pending@dominioncity.org', full_name: 'Pending Worker Test', role: 'Care Pastor', care_center_id: 'cmd-apapa', created_at: '2025-01-05T16:00:00Z', status: 'Pending' },
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-bethel-1',
    member_id: 'DCC-2026-01',
    names: 'Emeka Nwosu',
    phone_number: '+234 803 111 2222',
    address: '14, Bethel Avenue, Apapa, Lagos',
    gender: 'Male',
    marital_status: 'Married',
    dob: '1988-05-15',
    join_date: '2025-03-10',
    satellite_church_id: 'sat-bethel',
    department_id: 'dept-choir',
    email: 'emeka.nwosu@gmail.com',
    status: 'Active',
    created_at: '2026-06-01T10:00:00Z',
    person_type: 'Leader & Worker',
    leadership_position: 'Choir Leader',
    ministry_department: 'Music Ministry',
    worker_since: '2025-03-10',
    leadership_status: 'Active',
    reporting_pastor: 'Pastor Chidi Obi'
  },
  {
    id: 'mem-bethel-2',
    member_id: 'DCC-2026-02',
    names: 'Chioma Bethel',
    phone_number: '+234 812 333 4444',
    address: '22, Marine Road, Apapa, Lagos',
    gender: 'Female',
    marital_status: 'Single',
    dob: '1995-10-22',
    join_date: '2025-03-15',
    satellite_church_id: 'sat-bethel',
    department_id: 'dept-ushering',
    email: 'chioma.bethel@gmail.com',
    status: 'Active',
    created_at: '2026-06-01T11:30:00Z',
    person_type: 'Leader & Worker',
    leadership_position: 'Assistant Ushering Head',
    ministry_department: 'Helps Ministry',
    worker_since: '2025-03-15',
    leadership_status: 'Active',
    reporting_pastor: 'Sister Deborah Nwachukwu'
  },
  {
    id: 'mem-bethel-3',
    member_id: 'DCC-2026-03',
    names: 'Okonkwo Mary',
    phone_number: '+234 809 555 6666',
    address: '5, Point Road, Apapa, Lagos',
    gender: 'Female',
    marital_status: 'Married',
    dob: '1990-01-05',
    join_date: '2025-04-01',
    satellite_church_id: 'sat-bethel',
    department_id: 'dept-protocol',
    email: 'mary.okonkwo@gmail.com',
    status: 'Active',
    created_at: '2026-06-02T09:00:00Z',
    person_type: 'Member'
  },
  {
    id: 'mem-surulere-1',
    member_id: 'DCC-2026-04',
    names: 'Adeola Benson',
    phone_number: '+234 802 777 8888',
    address: '15, Bode Thomas Street, Surulere, Lagos',
    gender: 'Male',
    marital_status: 'Single',
    dob: '1992-08-14',
    join_date: '2025-02-10',
    satellite_church_id: 'sat-surulere',
    department_id: 'dept-media',
    email: 'adeola.benson@gmail.com',
    status: 'Active',
    created_at: '2026-06-01T12:00:00Z',
    person_type: 'Member'
  },
  {
    id: 'mem-festac-1',
    member_id: 'DCC-2026-05',
    names: 'Festus Eze',
    phone_number: '+234 803 999 0000',
    address: '10, 22 Road, Festac, Lagos',
    gender: 'Male',
    marital_status: 'Married',
    dob: '1985-11-30',
    join_date: '2025-02-20',
    satellite_church_id: 'sat-festac',
    department_id: 'dept-technical',
    email: 'festus.eze@gmail.com',
    status: 'Active',
    created_at: '2026-06-01T14:00:00Z',
    person_type: 'Leader & Worker',
    leadership_position: 'Technical Supervisor',
    ministry_department: 'Technical & Media Unit',
    worker_since: '2025-02-20',
    leadership_status: 'Active',
    reporting_pastor: 'Brother Samuel Ade'
  }
];

export const INITIAL_MEMBER_ATTENDANCE: MemberAttendance[] = [];

export const INITIAL_LEADER_WORKER_ATTENDANCE: any[] = [
  {
    id: 'lwa-1',
    member_id: 'mem-bethel-1', // Emeka Nwosu
    meeting_type: 'Leaders Meeting',
    meeting_date: '2026-06-15',
    start_time: '18:00',
    end_time: '19:30',
    attendance_status: 'Present',
    recorded_by: 'Pastor Peter Chidi',
    satellite_church_id: 'sat-bethel',
    created_at: '2026-06-15T19:30:00Z'
  },
  {
    id: 'lwa-2',
    member_id: 'mem-bethel-2', // Chioma Bethel
    meeting_type: 'Workers Meeting',
    meeting_date: '2026-06-16',
    start_time: '17:00',
    end_time: '18:30',
    attendance_status: 'Present',
    recorded_by: 'Pastor Peter Chidi',
    satellite_church_id: 'sat-bethel',
    created_at: '2026-06-16T18:30:00Z'
  },
  {
    id: 'lwa-3',
    member_id: 'mem-festac-1', // Festus Eze
    meeting_type: 'Departmental Meeting',
    meeting_date: '2026-06-18',
    start_time: '16:00',
    end_time: '17:30',
    attendance_status: 'Present',
    recorded_by: 'Sister Grace Okafor',
    satellite_church_id: 'sat-festac',
    created_at: '2026-06-18T17:30:00Z'
  },
  {
    id: 'lwa-4',
    member_id: 'mem-bethel-1', // Emeka Nwosu
    meeting_type: 'Leadership Retreat',
    meeting_date: '2026-06-20',
    start_time: '09:00',
    end_time: '16:00',
    attendance_status: 'Absent',
    recorded_by: 'Pastor Peter Chidi',
    satellite_church_id: 'sat-bethel',
    created_at: '2026-06-20T16:00:00Z'
  }
];

export const INITIAL_DEPARTMENT_ATTENDANCE: DepartmentAttendance[] = [];

export const INITIAL_CMD_REPORTS: CmdReport[] = [
  {
    id: 'rep-c-1',
    cmd: 'Apapa Central CMD',
    care_pastor: 'Pastor John George',
    care_center_name: 'Apapa Central CMD',
    care_center_address: '15, Wharf Road, Apapa, Lagos',
    date_of_meeting: '2026-06-06',
    report_week: 'Week 23',
    male: 14,
    female: 18,
    children: 5,
    mvp_present: 3,
    soul_won: 2,
    offering_cash: 12500,
    offering_transfer: 25000,
    total_attendance: 37,
    total_offering: 37500,
    goals_next_meeting: 'To win 5 souls and host a neighborhood family picnic.',
    treasurer_handling_cash: 'Sister Mary Ekong',
    goals_achieved: 'Yes',
    email_address: 'apapa_central_cmd@dominioncity.org',
    created_by: 'Pastor John George',
    created_at: '2026-06-06T19:00:00Z',
  },
  {
    id: 'rep-c-2',
    cmd: 'Surulere Care Center',
    care_pastor: 'Pastor Lawrence Udoh',
    care_center_name: 'Surulere Care Center',
    care_center_address: '42, Adeniran Ogunsanya Street, Surulere, Lagos',
    date_of_meeting: '2026-06-06',
    report_week: 'Week 23',
    male: 8,
    female: 12,
    children: 2,
    mvp_present: 1,
    soul_won: 1,
    offering_cash: 5000,
    offering_transfer: 18000,
    total_attendance: 22,
    total_offering: 23000,
    goals_next_meeting: 'Increase prayer time focus and follow up on new attendees.',
    treasurer_handling_cash: 'Sister Rachel Benson',
    goals_achieved: 'Partially',
    email_address: 'surulere_cmd@dominioncity.org',
    created_by: 'Pastor Lawrence Udoh',
    created_at: '2026-06-06T19:30:00Z',
  },
];

export const INITIAL_SATELLITE_REPORTS: SatelliteReport[] = [
  {
    id: 'rep-s-1',
    satellite_church_id: 'sat-surulere',
    church_name: 'Dominion City Surulere Satellite',
    church_loc: '88, Bode Thomas Street, Surulere, Lagos',
    pastor_nam: 'Pastor Lawrence Udoh',
    admin_nam: 'Brother Daniel Peter',
    service_date: '2026-06-07',
    service_type: 'Sunday Service',
    time_started: '08:30',
    time_ended: '11:45',
    male: 45,
    female: 62,
    children: 24,
    online: 15,
    mvp: 8,
    souls: 5,
    cash: 55000,
    transfer: 145000,
    total_attendance: 146,
    total_income: 200000,
    treasurer_nam: 'Sister Rachel Benson',
    people_called_for_service: 5,
    goal_for_next_midweek_service: 'Launch new cellular study outlines and reach 160 attendees.',
    created_by: 'Brother Daniel Peter',
    created_at: '2026-06-07T13:00:00Z',
  },
];

export const INITIAL_CARE_CENTER_REPORTS: CareCenterReport[] = [
  {
    id: 'cc-rep-1',
    cmd: 'CMD-APAPA-01',
    care_pastor: 'Pastor John George',
    care_center_id: 'cmd-apapa',
    care_center_name: 'Apapa Central CMD',
    care_center_address: '15, Wharf Road, Apapa, Lagos',
    meeting_date: '2026-06-05',
    report_week: 'Week 1',
    male: 10,
    female: 15,
    children: 5,
    total_attendance: 30,
    mvp_present: 4,
    soul_won: 3,
    offering_cash: 15000,
    offering_transfer: 25000,
    total_offering: 40000,
    goals_next_meeting: 'Follow up on all 4 MVPs and convert at least 2 of them to home cell group fellowship members.',
    treasurer_name: 'Sister Mary Ekong',
    goals_met: 'Yes',
    email_address: 'apapa_central_cmd@dominioncity.org',
    submitted_by: 'Pastor John George (Apapa Care)',
    created_at: '2026-06-05T19:45:00Z'
  },
  {
    id: 'cc-rep-2',
    cmd: 'CMD-SURL-02',
    care_pastor: 'Pastor Lawrence Udoh',
    care_center_id: 'cmd-surulere',
    care_center_name: 'Surulere Care Center',
    care_center_address: '42, Adeniran Ogunsanya Street, Surulere, Lagos',
    meeting_date: '2026-06-12',
    report_week: 'Week 2',
    male: 6,
    female: 10,
    children: 3,
    total_attendance: 19,
    mvp_present: 2,
    soul_won: 1,
    offering_cash: 8000,
    offering_transfer: 17000,
    total_offering: 25000,
    goals_next_meeting: 'Expand cell flyer outreach across neighboring streets during weekly prayer walk.',
    treasurer_name: 'Sister Rachel Benson',
    goals_met: 'Partially',
    email_address: 'surulere_cmd@dominioncity.org',
    submitted_by: 'Deaconess Sarah Peters',
    created_at: '2026-06-12T20:15:00Z'
  }
];

export const INITIAL_FINANCE_CATEGORIES = [
  { id: 'cat-offering', category_name: 'Weekly Offerings', type: 'Income' },
  { id: 'cat-tithe', category_name: 'Tithe Contribution', type: 'Income' },
  { id: 'cat-seed', category_name: 'Special seed offering', type: 'Income' },
  { id: 'cat-welfare', category_name: 'Community/Member Welfare', type: 'Expense' },
  { id: 'cat-rent', category_name: 'Branch Facility Rental', type: 'Expense' },
  { id: 'cat-utility', category_name: 'Electricity & Fuel Expenses', type: 'Expense' },
];

export const INITIAL_FINANCES: any[] = [
  {
    id: 'fin-1',
    type: 'Income',
    category_id: 'cat-offering',
    amount: 150000,
    transaction_date: '2026-06-01',
    description: 'First Sunday offering contribution across satellite units',
    recorded_by: 'Brother Daniel Peter',
    satellite_church_id: 'sat-surulere'
  },
  {
    id: 'fin-2',
    type: 'Income',
    category_id: 'cat-tithe',
    amount: 230000,
    transaction_date: '2026-06-02',
    description: 'Weekly branch tithe records entry',
    recorded_by: 'Brother Silas Eze',
    satellite_church_id: 'sat-ajegunle'
  },
  {
    id: 'fin-3',
    type: 'Expense',
    category_id: 'cat-utility',
    amount: 45000,
    transaction_date: '2026-06-03',
    description: 'Diesel pump purchases for main backup power generator',
    recorded_by: 'Sister Grace Okafor',
    satellite_church_id: 'sat-festac'
  }
];

