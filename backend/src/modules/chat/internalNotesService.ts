import { supabase } from '../../core/config/supabase';

export class InternalNotesService {
  // Create internal note
  async createNote(
    conversationId: string,
    userId: string,
    organizationId: string,
    note: string,
    isVisibleToAll: boolean = false
  ) {
    try {
      const { data: newNote, error } = await supabase
        .from('internal_notes')
        .insert({
          organization_id: organizationId,
          conversation_id: conversationId,
          user_id: userId,
          note: note,
          is_visible_to_all: isVisibleToAll
        })
        .select(`
          *,
          users(name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      return newNote;
    } catch (error) {
      console.error('Error creating internal note:', error);
      throw error;
    }
  }

  // Get notes for a conversation
  async getConversationNotes(conversationId: string, organizationId: string) {
    try {
      const { data: notes, error } = await supabase
        .from('internal_notes')
        .select(`
          *,
          users(name, email, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return notes;
    } catch (error) {
      console.error('Error getting conversation notes:', error);
      throw error;
    }
  }

  // Update note
  async updateNote(noteId: string, userId: string, organizationId: string, note: string, isVisibleToAll?: boolean) {
    try {
      const updateData: any = { note, updated_at: new Date().toISOString() };
      if (isVisibleToAll !== undefined) {
        updateData.is_visible_to_all = isVisibleToAll;
      }

      const { data: updatedNote, error } = await supabase
        .from('internal_notes')
        .update(updateData)
        .eq('id', noteId)
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select(`
          *,
          users(name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      return updatedNote;
    } catch (error) {
      console.error('Error updating internal note:', error);
      throw error;
    }
  }

  // Delete note
  async deleteNote(noteId: string, userId: string, organizationId: string) {
    try {
      const { error } = await supabase
        .from('internal_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting internal note:', error);
      throw error;
    }
  }

  // Get all notes for organization (admin view)
  async getOrganizationNotes(organizationId: string) {
    try {
      const { data: notes, error } = await supabase
        .from('internal_notes')
        .select(`
          *,
          users(name, email, avatar_url),
          conversations(id, contact_id)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return notes;
    } catch (error) {
      console.error('Error getting organization notes:', error);
      throw error;
    }
  }
}

export const internalNotesService = new InternalNotesService();
