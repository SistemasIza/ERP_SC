import { supabase } from '../../core/config/supabase';

export const adminService = {
  // --- ORGANIZATIONS ---
  async getOrganizations() {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        *,
        user_count:users(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (orgs || []).map(org => ({
      ...org,
      userCount: org.user_count?.[0]?.count || 0
    }));
  },

  async createOrganization(name: string, plan: string = 'free') {
    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, plan })
      .select()
      .single();

    if (error) throw error;
    return org;
  },

  async updateOrganization(id: string, name?: string, plan?: string) {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (plan !== undefined) updateData.plan = plan;

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return org;
  },

  async updateOrganizationPayment(id: string, paymentStatus: string) {
    const { data: org, error } = await supabase
      .from('organizations')
      .update({ payment_status: paymentStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return org;
  },

  async updateOrganizationNotification(id: string, notification: string | null, showPopup: boolean) {
    const { data: org, error } = await supabase
      .from('organizations')
      .update({
        admin_notification: notification,
        show_overdue_popup: showPopup,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return org;
  },

  async getOrganizationNotifications() {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, admin_notification, show_overdue_popup, payment_status, plan')
      .not('admin_notification', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return orgs || [];
  },

  async deleteOrganization(id: string) {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  // --- USERS ---
  async getUsers() {
    const { data: users, error } = await supabase
      .from('users')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return users;
  },

  async createUser(userData: {
    email: string;
    full_name: string;
    role: string;
    organization_id: string | null;
    password?: string;
  }) {
    const { email, full_name, role, organization_id, password } = userData;
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        role: role || 'agent',
        organization_id: organization_id === '' ? null : organization_id,
        password_hash: password, // Placeholder: hash this in production
        whatsapp_connections_limit: 3,
        active_whatsapp_connections: 0
      })
      .select()
      .single();

    if (error) throw error;
    return user;
  },

  async updateUser(id: string, userData: {
    full_name?: string;
    role?: string;
    organization_id?: string | null;
    password?: string;
  }) {
    const { full_name, role, organization_id, password } = userData;
    const updateData: any = { full_name, role };
    if (organization_id !== undefined) {
      updateData.organization_id = organization_id === '' ? null : organization_id;
    }
    if (password) updateData.password_hash = password;

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return user;
  },

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }
};
