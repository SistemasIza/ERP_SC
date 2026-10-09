import { supabase } from '../../core/config/supabase';

export class AssignmentService {
  // Manual assignment
  async assignConversation(conversationId: string, userId: string, organizationId: string) {
    try {
      // Update conversation assignment
      const { data: conversation, error } = await supabase
        .from('conversations')
        .update({
          assigned_to: userId,
          assigned_at: new Date().toISOString(),
          assignment_type: 'manual'
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Update agent workload
      await this.updateAgentWorkload(userId, organizationId, 1);

      return conversation;
    } catch (error) {
      console.error('Error assigning conversation:', error);
      throw error;
    }
  }

  // Round Robin assignment
  async assignConversationRoundRobin(conversationId: string, organizationId: string) {
    try {
      // Get all available agents in the organization
      const { data: agents, error: agentsError } = await supabase
        .from('agent_workload')
        .select('*, user_id, users(name, email)')
        .eq('organization_id', organizationId)
        .eq('is_online', true)
        .eq('is_available', true)
        .order('last_assigned_at', { ascending: true, nullsFirst: true })
        .limit(1);

      if (agentsError) throw agentsError;

      if (!agents || agents.length === 0) {
        throw new Error('No available agents found');
      }

      const agent = agents[0];

      // Assign conversation to the selected agent
      const { data: conversation, error } = await supabase
        .from('conversations')
        .update({
          assigned_to: agent.user_id,
          assigned_at: new Date().toISOString(),
          assignment_type: 'round_robin'
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Update agent workload
      await this.updateAgentWorkload(agent.user_id, organizationId, 1);

      return conversation;
    } catch (error) {
      console.error('Error assigning conversation round robin:', error);
      throw error;
    }
  }

  // Load balance assignment
  async assignConversationLoadBalance(conversationId: string, organizationId: string) {
    try {
      // Get agent with lowest workload
      const { data: agents, error: agentsError } = await supabase
        .from('agent_workload')
        .select('*, user_id, users(name, email)')
        .eq('organization_id', organizationId)
        .eq('is_online', true)
        .eq('is_available', true)
        .order('active_conversations', { ascending: true })
        .limit(1);

      if (agentsError) throw agentsError;

      if (!agents || agents.length === 0) {
        throw new Error('No available agents found');
      }

      const agent = agents[0];

      // Assign conversation to the selected agent
      const { data: conversation, error } = await supabase
        .from('conversations')
        .update({
          assigned_to: agent.user_id,
          assigned_at: new Date().toISOString(),
          assignment_type: 'load_balance'
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Update agent workload
      await this.updateAgentWorkload(agent.user_id, organizationId, 1);

      return conversation;
    } catch (error) {
      console.error('Error assigning conversation load balance:', error);
      throw error;
    }
  }

  // Unassign conversation
  async unassignConversation(conversationId: string, organizationId: string) {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('assigned_to')
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      if (conversation?.assigned_to) {
        // Decrease agent workload
        await this.updateAgentWorkload(conversation.assigned_to, organizationId, -1);
      }

      // Update conversation
      const { data: updatedConversation, error: updateError } = await supabase
        .from('conversations')
        .update({
          assigned_to: null,
          assigned_at: null,
          assignment_type: null
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedConversation;
    } catch (error) {
      console.error('Error unassigning conversation:', error);
      throw error;
    }
  }

  // Transfer conversation to another agent
  async transferConversation(
    conversationId: string,
    fromUserId: string,
    toUserId: string,
    organizationId: string,
    reason?: string
  ) {
    try {
      // Get current conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      // Log the transfer
      await supabase.from('conversation_transfers').insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        reason: reason
      });

      // Update conversation
      const { data: updatedConversation, error: updateError } = await supabase
        .from('conversations')
        .update({
          assigned_to: toUserId,
          assigned_at: new Date().toISOString(),
          assignment_type: 'manual',
          is_transferred: true,
          transferred_from: fromUserId,
          transferred_at: new Date().toISOString(),
          transfer_reason: reason
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update workloads
      if (conversation.assigned_to) {
        await this.updateAgentWorkload(conversation.assigned_to, organizationId, -1);
      }
      await this.updateAgentWorkload(toUserId, organizationId, 1);

      return updatedConversation;
    } catch (error) {
      console.error('Error transferring conversation:', error);
      throw error;
    }
  }

  // Transfer conversation to a department
  async transferConversationToDepartment(
    conversationId: string,
    fromUserId: string,
    departmentId: string,
    organizationId: string,
    reason?: string
  ) {
    try {
      // Get department members
      const { data: members, error: membersError } = await supabase
        .from('department_members')
        .select('user_id')
        .eq('department_id', departmentId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        throw new Error('No members found in department');
      }

      // Assign to first available member using round robin
      const { data: agentWorkload, error: workloadError } = await supabase
        .from('agent_workload')
        .select('*, user_id')
        .eq('organization_id', organizationId)
        .eq('is_online', true)
        .eq('is_available', true)
        .in('user_id', members.map(m => m.user_id))
        .order('active_conversations', { ascending: true })
        .limit(1);

      if (workloadError) throw workloadError;

      if (!agentWorkload || agentWorkload.length === 0) {
        throw new Error('No available agents in department');
      }

      const agent = agentWorkload[0];

      // Log the transfer
      await supabase.from('conversation_transfers').insert({
        organization_id: organizationId,
        conversation_id: conversationId,
        from_user_id: fromUserId,
        to_department_id: departmentId,
        reason: reason
      });

      // Update conversation
      const { data: updatedConversation, error: updateError } = await supabase
        .from('conversations')
        .update({
          assigned_to: agent.user_id,
          assigned_at: new Date().toISOString(),
          assignment_type: 'manual',
          is_transferred: true,
          transferred_from: fromUserId,
          transferred_at: new Date().toISOString(),
          transfer_reason: reason,
          department: departmentId
        })
        .eq('id', conversationId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update workloads
      const { data: currentConversation } = await supabase
        .from('conversations')
        .select('assigned_to')
        .eq('id', conversationId)
        .single();

      if (currentConversation?.assigned_to) {
        await this.updateAgentWorkload(currentConversation.assigned_to, organizationId, -1);
      }
      await this.updateAgentWorkload(agent.user_id, organizationId, 1);

      return updatedConversation;
    } catch (error) {
      console.error('Error transferring conversation to department:', error);
      throw error;
    }
  }

  // Update agent workload
  private async updateAgentWorkload(userId: string, organizationId: string, delta: number) {
    try {
      const { data: workload, error } = await supabase
        .from('agent_workload')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (error || !workload) {
        // Create workload record if it doesn't exist
        await supabase.from('agent_workload').insert({
          organization_id: organizationId,
          user_id: userId,
          active_conversations: Math.max(0, delta),
          total_conversations_today: delta > 0 ? 1 : 0,
          last_assigned_at: new Date().toISOString()
        });
      } else {
        // Update existing workload
        await supabase
          .from('agent_workload')
          .update({
            active_conversations: Math.max(0, workload.active_conversations + delta),
            total_conversations_today: delta > 0 ? workload.total_conversations_today + 1 : workload.total_conversations_today,
            last_assigned_at: delta > 0 ? new Date().toISOString() : workload.last_assigned_at
          })
          .eq('user_id', userId)
          .eq('organization_id', organizationId);
      }
    } catch (error) {
      console.error('Error updating agent workload:', error);
    }
  }

  // Get agent workload
  async getAgentWorkload(userId: string, organizationId: string) {
    try {
      const { data: workload, error } = await supabase
        .from('agent_workload')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      return workload;
    } catch (error) {
      console.error('Error getting agent workload:', error);
      throw error;
    }
  }

  // Set agent availability
  async setAgentAvailability(userId: string, organizationId: string, isAvailable: boolean) {
    try {
      const { data: workload, error } = await supabase
        .from('agent_workload')
        .update({ is_available: isAvailable })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      return workload;
    } catch (error) {
      console.error('Error setting agent availability:', error);
      throw error;
    }
  }

  // Set agent online status
  async setAgentOnlineStatus(userId: string, organizationId: string, isOnline: boolean) {
    try {
      const { data: workload, error } = await supabase
        .from('agent_workload')
        .update({ is_online: isOnline })
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      return workload;
    } catch (error) {
      console.error('Error setting agent online status:', error);
      throw error;
    }
  }
}

export const assignmentService = new AssignmentService();
