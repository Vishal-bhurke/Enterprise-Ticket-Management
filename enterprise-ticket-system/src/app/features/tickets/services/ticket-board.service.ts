import { computed, inject, Injectable, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../../../shared/models/ticket.model';
import { Profile } from '../../../shared/models/user.model';

const BOARD_TICKET_SELECT = `
  *,
  status:statuses!status_id(id, name, slug, color, category, is_closed, sort_order),
  priority:priorities!priority_id(id, name, slug, color, level, icon),
  assignee:profiles!assignee_id(id, full_name, avatar_url),
  category:categories!category_id(id, name, code)
`;

export interface BoardColumn {
  status: TicketStatus;
  tickets: Ticket[];
}

@Injectable({ providedIn: 'root' })
export class TicketBoardService extends SupabaseService {
  private toastService = inject(ToastService);

  // State signals
  readonly tickets = signal<Ticket[]>([]);
  readonly statuses = signal<TicketStatus[]>([]);
  readonly priorities = signal<TicketPriority[]>([]);
  readonly agents = signal<Partial<Profile>[]>([]);
  readonly categories = signal<TicketCategory[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isSavingMove = signal(false);

  // Filter signals — read by filteredColumns computed
  readonly filterPriorityId = signal<string | null>(null);
  readonly filterCategoryId = signal<string | null>(null);
  readonly filterAssigneeId = signal<string | null>(null);
  readonly searchQuery = signal('');

  // Computed: group filtered tickets into status columns
  readonly filteredColumns = computed((): BoardColumn[] => {
    const statuses = this.statuses();
    let tickets = this.tickets();

    const priorityId = this.filterPriorityId();
    const categoryId = this.filterCategoryId();
    const assigneeId = this.filterAssigneeId();
    const query = this.searchQuery().toLowerCase().trim();

    if (priorityId) tickets = tickets.filter(t => t.priority_id === priorityId);
    if (categoryId) tickets = tickets.filter(t => t.category_id === categoryId);
    if (assigneeId) tickets = tickets.filter(t => t.assignee_id === assigneeId);
    if (query) {
      tickets = tickets.filter(t =>
        t.ticket_number.toLowerCase().includes(query) ||
        t.title.toLowerCase().includes(query)
      );
    }

    return statuses.map(status => ({
      status,
      tickets: tickets.filter(t => t.status_id === status.id),
    }));
  });

  readonly totalVisibleTickets = computed(() =>
    this.filteredColumns().reduce((sum, col) => sum + col.tickets.length, 0)
  );

  private realtimeChannel: RealtimeChannel | null = null;
  private lastRoleSlug = '';
  private lastUserId = '';

  async loadBoard(roleSlug: string, userId: string): Promise<void> {
    this.lastRoleSlug = roleSlug;
    this.lastUserId = userId;
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadStatuses(),
        this.loadTickets(roleSlug, userId),
        this.loadOptions(),
      ]);
    } catch (err) {
      const r = this.handleError(err);
      this.error.set(r.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStatuses(): Promise<void> {
    const { data, error } = await this.client
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    this.statuses.set((data as TicketStatus[]) ?? []);
  }

  private async loadTickets(roleSlug: string, userId: string): Promise<void> {
    let query = this.client
      .from('tickets')
      .select(BOARD_TICKET_SELECT)
      .order('created_at', { ascending: false })
      .limit(300);

    // Role-based filtering (mirrors ticket.service.ts RLS logic)
    if (roleSlug === 'agent') {
      query = query.or(`assignee_id.eq.${userId},requester_id.eq.${userId}`);
    } else if (roleSlug === 'end_user') {
      query = query.eq('requester_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    this.tickets.set((data as Ticket[]) ?? []);
  }

  async loadOptions(): Promise<void> {
    const [priorityRes, categoryRes, agentRes] = await Promise.all([
      this.client.from('priorities').select('id, name, slug, color, level, icon, sla_multiplier, is_active').eq('is_active', true).order('level'),
      this.client.from('categories').select('id, name, code, description, parent_id, is_active').eq('is_active', true).order('name'),
      this.client.from('profiles').select('id, full_name, avatar_url, email').eq('is_active', true).order('full_name'),
    ]);
    if (priorityRes.data) this.priorities.set(priorityRes.data as TicketPriority[]);
    if (categoryRes.data) this.categories.set(categoryRes.data as TicketCategory[]);
    if (agentRes.data) this.agents.set(agentRes.data as Partial<Profile>[]);
  }

  /**
   * Optimistically moves a ticket to a new status column, then persists to DB.
   * Rolls back on API failure.
   */
  async moveTicket(ticketId: string, newStatusId: string): Promise<void> {
    if (this.isSavingMove()) return; // Prevent concurrent moves
    const previousTickets = this.tickets();
    const newStatus = this.statuses().find(s => s.id === newStatusId);

    // Optimistic update — updates filteredColumns immediately via computed
    this.isSavingMove.set(true);
    this.tickets.update(list =>
      list.map(t => t.id === ticketId ? { ...t, status_id: newStatusId, status: newStatus } : t)
    );

    try {
      const userId = await this.getCurrentUserId();
      const { error } = await this.client
        .from('tickets')
        .update({ status_id: newStatusId, updated_by: userId })
        .eq('id', ticketId);
      if (error) throw error;
    } catch (err) {
      // Rollback on failure
      this.tickets.set(previousTickets);
      const r = this.handleError(err);
      this.toastService.error(r.message);
    } finally {
      this.isSavingMove.set(false);
    }
  }

  clearFilters(): void {
    this.filterPriorityId.set(null);
    this.filterCategoryId.set(null);
    this.filterAssigneeId.set(null);
    this.searchQuery.set('');
  }

  subscribeRealtime(): void {
    if (this.realtimeChannel) return;
    this.realtimeChannel = this.client
      .channel('ticket-board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          // Re-fetch board on any ticket change (ignores moves initiated by this user
          // since those are already handled optimistically)
          if (this.lastRoleSlug && this.lastUserId && !this.isSavingMove()) {
            this.loadBoard(this.lastRoleSlug, this.lastUserId);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[TicketBoardService] Realtime: SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[TicketBoardService] Realtime failed:', status);
        }
      });
  }

  unsubscribeRealtime(): void {
    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}
