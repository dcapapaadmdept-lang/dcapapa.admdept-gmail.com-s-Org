import os

with open('src/supabaseClient.ts', 'r') as f:
    content = f.read()

start_marker = 'export const api = {'
end_marker = '// FULL PRODUCTION-READY SCHEMA SQL'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_api = '''export const api = {
  getProfiles: async (activeProfile: Profile): Promise<Profile[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  },

  updateProfile: async (profile: Profile): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('profiles').upsert(profile);
    if (error) throw error;
  },

  getMembers: async (activeProfile: Profile): Promise<Member[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('members').select('*');
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
    } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
      query = query.eq('care_center_id', activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
      if (cData && cData.length > 0) {
        const ids = cData.map(c => c.id);
        query = query.in('care_center_id', ids);
      } else {
        query = query.eq('care_center_id', 'none-matching-id');
      }
    } else if (role === 'Department Head' && activeProfile?.department_id) {
      query = query.eq('department_id', activeProfile.department_id);
    } else if (role === 'Member' && activeProfile?.email) {
      query = query.eq('email', activeProfile.email);
    }
    const { data, error } = await query.order('names', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  saveMember: async (member: Member): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('members').upsert(member);
    if (error) throw error;
  },

  deleteMember: async (id: string): Promise<{ success: boolean; member_id: string; payload: any; supabase_response: any }> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const deletePayload = { id, target_table: 'members' };
    const cascadeResults: any = {};

    try {
      const res = await supabase.from('member_attendance').delete().eq('member_id', id);
      cascadeResults.member_attendance = res;
    } catch (e: any) {
      console.warn('Could not clear member_attendance entries:', e);
    }

    try {
      const res = await supabase.from('department_attendance').delete().eq('member_id', id);
      cascadeResults.department_attendance = res;
    } catch (e: any) {
      console.warn('Could not clear department_attendance entries:', e);
    }

    try {
      await supabase.from('department_members').delete().eq('member_id', id);
    } catch (e) {
      console.warn('Could not clear department_members links:', e);
    }
    try {
      await supabase.from('cmd_members').delete().eq('member_id', id);
    } catch (e) {
      console.warn('Could not clear cmd_members links:', e);
    }
    try {
      await supabase.from('satellite_members').delete().eq('member_id', id);
    } catch (e) {
      console.warn('Could not clear satellite_members links:', e);
    }

    const mainResult = await supabase.from('members').delete().eq('id', id);
    if (mainResult.error) throw mainResult.error;

    return {
      success: true,
      member_id: id,
      payload: deletePayload,
      supabase_response: {
        main_query_result: mainResult,
        cascaded_queries: cascadeResults
      }
    };
  },

  getDepartments: async (activeProfile: Profile): Promise<Department[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('departments').select('*');
    if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
      query = query.eq('id', activeProfile.department_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveDepartment: async (dept: Department): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('departments').upsert(dept);
    if (error) throw error;
  },

  deleteDepartment: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
  },

  getCareCenters: async (activeProfile: Profile): Promise<CareCenter[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('care_centers').select('*');
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      query = query.eq('id', activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
      query = query.ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveCareCenter: async (center: CareCenter): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('care_centers').upsert(center);
    if (error) throw error;
  },

  deleteCareCenter: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('care_centers').delete().eq('id', id);
    if (error) throw error;
  },

  getSatelliteChurches: async (activeProfile: Profile): Promise<SatelliteChurch[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('satellite_churches').select('*');
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('id', activeProfile.satellite_church_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveSatelliteChurch: async (church: SatelliteChurch): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('satellite_churches').upsert(church);
    if (error) throw error;
  },

  deleteSatelliteChurch: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('satellite_churches').delete().eq('id', id);
    if (error) throw error;
  },

  getMemberAttendance: async (activeProfile: Profile): Promise<MemberAttendance[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('member_attendance').select('*');
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
    } else if (role === 'Care Pastor' && activeProfile?.care_center_id) {
      query = query.eq('care_center_id', activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
      if (cData && cData.length > 0) {
        query = query.in('care_center_id', cData.map(c => c.id));
      } else {
        query = query.eq('care_center_id', 'none-matching-id');
      }
    } else if (role === 'Department Head' && activeProfile?.department_id) {
      query = query.eq('department_id', activeProfile.department_id);
    } else if (role === 'Member' && activeProfile?.email) {
      const { data: mData } = await supabase.from('members').select('id').eq('email', activeProfile.email);
      if (mData && mData.length > 0) {
        query = query.eq('member_id', mData[0].id);
      } else {
        query = query.eq('member_id', 'none-matching-id');
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveMemberAttendance: async (record: MemberAttendance): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('member_attendance').upsert(record);
    if (error) throw error;
  },

  deleteMemberAttendance: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('member_attendance').delete().eq('id', id);
    if (error) throw error;
  },

  getLeaderWorkerAttendance: async (activeProfile: Profile): Promise<LeaderWorkerAttendance[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('leader_worker_attendance').select('*');
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveLeaderWorkerAttendance: async (record: LeaderWorkerAttendance): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('leader_worker_attendance').upsert(record);
    if (error) throw error;
  },

  saveLeaderWorkerAttendanceBulk: async (records: LeaderWorkerAttendance[]): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('leader_worker_attendance').upsert(records);
    if (error) throw error;
  },

  deleteLeaderWorkerAttendance: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('leader_worker_attendance').delete().eq('id', id);
    if (error) throw error;
  },

  getDepartmentAttendance: async (activeProfile: Profile): Promise<DepartmentAttendance[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('department_attendance').select('*');
    if (activeProfile?.role === 'Department Head' && activeProfile?.department_id) {
      query = query.eq('department_id', activeProfile.department_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveDepartmentAttendance: async (records: DepartmentAttendance[]): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('department_attendance').upsert(records);
    if (error) throw error;
  },

  getCmdReports: async (activeProfile: Profile): Promise<CmdReport[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('cmd_reports').select('*');
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      query = query.eq('care_center_id', activeProfile.care_center_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveCmdReport: async (report: CmdReport): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('cmd_reports').upsert(report);
    if (error) throw error;
  },

  deleteCmdReport: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('cmd_reports').delete().eq('id', id);
    if (error) throw error;
  },

  getSatelliteReports: async (activeProfile: Profile): Promise<SatelliteReport[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('satellite_reports').select('*');
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(activeProfile?.role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveSatelliteReport: async (report: SatelliteReport): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('satellite_reports').upsert(report);
    if (error) throw error;
  },

  deleteSatelliteReport: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('satellite_reports').delete().eq('id', id);
    if (error) throw error;
  },

  getCareCenterReports: async (activeProfile: Profile): Promise<CareCenterReport[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('care_center_reports').select('*');
    if (activeProfile?.role === 'Care Pastor' && activeProfile?.care_center_id) {
      query = query.eq('care_center_id', activeProfile.care_center_id);
    } else if (['CMD', 'Church Ministry Director'].includes(activeProfile?.role || '') && activeProfile?.assigned_cmd_name) {
      query = query.ilike('care_center_name', `%${activeProfile.assigned_cmd_name}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveCareCenterReport: async (report: CareCenterReport): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('care_center_reports').upsert(report);
    if (error) throw error;
  },

  deleteCareCenterReport: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('care_center_reports').delete().eq('id', id);
    if (error) throw error;
  },

  getFinances: async (activeProfile: Profile): Promise<Finance[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    let query = supabase.from('finances').select('*');
    const role = activeProfile?.role;
    if (['Satellite Church Admin', 'satellite_admin', 'Satellite Admin'].includes(role || '') && activeProfile?.satellite_church_id) {
      query = query.eq('satellite_church_id', activeProfile.satellite_church_id);
    } else if (['CMD', 'Church Ministry Director'].includes(role || '') && activeProfile?.assigned_cmd_name) {
      const { data: cData } = await supabase.from('care_centers').select('id').ilike('cmd_name', `%${activeProfile.assigned_cmd_name}%`);
      if (cData && cData.length > 0) {
        const ids = cData.map(c => c.id);
        query = query.in('care_center_id', ids);
      } else {
        query = query.eq('care_center_id', 'none-matching-id');
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  saveFinance: async (record: Finance): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('finances').upsert(record);
    if (error) throw error;
  },

  deleteFinance: async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('finances').delete().eq('id', id);
    if (error) throw error;
  },

  getFinanceCategories: async (): Promise<any[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return [];
    const { data, error } = await supabase.from('finance_categories').select('*');
    if (error) throw error;
    return data || [];
  },

  saveFinanceCategory: async (cat: any): Promise<void> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase.from('finance_categories').upsert(cat);
    if (error) throw error;
  }
};\n\n'''

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_api + content[end_idx:]
    with open('src/supabaseClient.ts', 'w') as f:
        f.write(new_content)
    print('API REPLACED SAFELY')
else:
    print('API MARKERS NOT FOUND')
