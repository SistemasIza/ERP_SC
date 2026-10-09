import { supabase } from '../../core/config/supabase';

export interface MessageTemplateRow {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usage_count: number;
  last_used_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{\s*([\w\s-]+)\s*\}\}/g) || [];
  const vars = matches.map((m) => m.replace(/\{\{\s*|\s*\}\}/g, '').trim());
  return [...new Set(vars)];
}

export class MessageTemplatesService {
  async list(organizationId: string, category?: string): Promise<MessageTemplateRow[]> {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as MessageTemplateRow[];
  }

  async getOne(id: string, organizationId: string): Promise<MessageTemplateRow> {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data as MessageTemplateRow;
  }

  async create(data: {
    organizationId: string;
    name: string;
    category: string;
    content: string;
    createdBy?: string | null;
  }): Promise<MessageTemplateRow> {
    const variables = extractVariables(data.content);

    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({
        organization_id: data.organizationId,
        name: data.name,
        category: data.category || 'general',
        content: data.content,
        variables,
        created_by: data.createdBy || null,
      })
      .select()
      .single();

    if (error) throw error;
    return template as MessageTemplateRow;
  }

  async update(id: string, organizationId: string, updates: {
    name?: string;
    category?: string;
    content?: string;
  }): Promise<MessageTemplateRow> {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.content !== undefined) {
      updateData.content = updates.content;
      updateData.variables = extractVariables(updates.content);
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data as MessageTemplateRow;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;
  }

  async incrementUsage(id: string): Promise<void> {
    const { error } = await supabase
      .rpc('increment_template_usage', { template_id: id });

    if (error) {
      // Fallback: increment manually
      const { data: template } = await supabase
        .from('message_templates')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (template) {
        await supabase
          .from('message_templates')
          .update({
            usage_count: (template.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', id);
      }
    }
  }

  async getStats(organizationId: string) {
    const { data, error } = await supabase
      .from('message_templates')
      .select('id, category, usage_count, is_active')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const templates = data || [];
    const totalTemplates = templates.length;
    const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);
    const byCategory = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostUsed = [...templates].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5);

    return {
      totalTemplates,
      totalUsage,
      byCategory,
      mostUsed,
    };
  }
}

export const messageTemplatesService = new MessageTemplatesService();
