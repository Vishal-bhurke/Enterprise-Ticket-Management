import { computed, inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  CreateTicketDto,
  DEFAULT_TICKET_FILTERS,
  Ticket,
  TicketDetail,
  TicketFilterParams,
  UpdateTicketDto,
} from '../../../shared/models/ticket.model';
import { ApiResponse } from '../../../shared/models/api-response.model';

const TICKET_SELECT = `
  *,
  status:statuses!status_id(id, name, slug, color, category, is_closed),
  priority:priorities!priority_id(id, name, slug, color, level),
  category:categories!category_id(id, name, code),
  ticket_type:ticket_types!ticket_type_id(id, name, slug, icon),
  assignee:profiles!assignee_id(id, full_name, avatar_url, email),
  requester:profiles!requester_id(id, full_name, avatar_url, email),
  department:departments!department_id(id, name, code)
`;

@Injectable({ providedIn: 'root' })
export class TicketService extends SupabaseService {
  private toastService = inject(ToastService);

  // State signals
  readonly tickets = signal<Ticket[]>([]);
  readonly selectedTicket = signal<TicketDetail | null>(null);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly filters = signal<TicketFilterParams>({ ...DEFAULT_TICKET_FILTERS });

  // Computed
  readonly isEmpty = computed(() => !this.isLoading() && this.tickets().length === 0 && !this.error());
  readonly totalPages = computed(() => Math.ceil(this.totalCount() / this.filters().pageSize));

  async getTickets(params: TicketFilterParams, myTicketsUserId?: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.filters.set(params);

    try {
      const offset = (params.page - 1) * params.pageSize;
      let query = this.client
        .from('tickets')
        .select(TICKET_SELECT, { count: 'exact' });

      // Role-based filters
      if (myTicketsUserId) {
        query = query.or(`requester_id.eq.${myTicketsUserId},assignee_id.eq.${myTicketsUserId}`);
      }

      // Apply search
      if (params.search) {
        query = query.or(
          `title.ilike.%${params.search}%,ticket_number.ilike.%${params.search}%`
        );
      }

      // Apply filters
      if (params.status_id)     query = query.eq('status_id', params.status_id);
      if (params.priority_id)   query = query.eq('priority_id', params.priority_id);
      if (params.category_id)   query = query.eq('category_id', params.category_id);
      if (params.department_id) query = query.eq('department_id', params.department_id);
      if (params.assignee_id)   query = query.eq('assignee_id', params.assignee_id);
      if (params.queue_id)      query = query.eq('queue_id', params.queue_id);
      if (params.is_escalated !== undefined) query = query.eq('is_escalated', params.is_escalated);
      if (params.date_from)     query = query.gte('created_at', params.date_from);
      if (params.date_to)       query = query.lte('created_at', params.date_to);
      if (params.tags?.length)  query = query.overlaps('tags', params.tags);

      // Sort and paginate
      const sortField = params.sortField ?? 'created_at';
      const ascending = params.sortOrder === 'asc';
      query = query.order(sortField, { ascending }).range(offset, offset + params.pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      this.tickets.set((data as Ticket[]) ?? []);
      this.totalCount.set(count ?? 0);
    } catch (err) {
      const r = this.handleError(err);
      this.error.set(r.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async getTicketById(id: string): Promise<ApiResponse<TicketDetail | null>> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.client
        .from('tickets')
        .select(`
          ${TICKET_SELECT},
          comments:ticket_comments(
            id, body, is_internal, mentions, created_at, updated_at,
            author:profiles!author_id(id, full_name, avatar_url)
          ),
          attachments:ticket_attachments(
            id, file_name, file_size, mime_type, storage_path, created_at,
            uploader:profiles!uploaded_by(id, full_name)
          ),
          links:ticket_links!source_id(
            id, link_type, target_id,
            target:tickets!target_id(id, ticket_number, title, status_id)
          ),
          sla_events(id, event_type, due_at, met_at, is_breached, paused_at, total_pause_mins)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      const ticket = data as TicketDetail;
      this.selectedTicket.set(ticket);
      return this.success(ticket);
    } catch (err) {
      const r = this.handleError(err);
      this.error.set(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createTicket(payload: CreateTicketDto): Promise<ApiResponse<Ticket | null>> {
    this.isSubmitting.set(true);

    try {
      const userId = await this.getCurrentUserId();

      // Fetch the default status (Open) — required by tickets.status_id NOT NULL constraint.
      // The seed data marks 'Open' as is_default = true.
      const { data: defaultStatus, error: statusError } = await this.client
        .from('statuses')
        .select('id')
        .eq('is_default', true)
        .single();

      if (statusError || !defaultStatus) {
        this.toastService.error('System configuration error: no default status found. Contact your administrator.');
        return this.handleError(new Error('No default status configured')) as ApiResponse<null>;
      }

      const { data, error } = await this.client
        .from('tickets')
        .insert({
          ...payload,
          status_id: (defaultStatus as { id: string }).id,
          requester_id: userId,
          created_by: userId,
        })
        .select(TICKET_SELECT)
        .single();

      if (error) throw error;
      this.toastService.success(`Ticket ${(data as Ticket).ticket_number} created successfully`);
      return this.success(data as Ticket, 'Ticket created');
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async updateTicket(id: string, payload: UpdateTicketDto): Promise<ApiResponse<Ticket | null>> {
    this.isSubmitting.set(true);

    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await this.client
        .from('tickets')
        .update({ ...payload, updated_by: userId })
        .eq('id', id)
        .select(TICKET_SELECT)
        .single();

      if (error) throw error;
      this.selectedTicket.set(data as TicketDetail);
      this.toastService.success('Ticket updated successfully');
      return this.success(data as Ticket, 'Ticket updated');
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteTicket(id: string): Promise<ApiResponse<null>> {
    this.isSubmitting.set(true);

    try {
      const { error } = await this.client.from('tickets').delete().eq('id', id);
      if (error) throw error;
      this.tickets.update(list => list.filter(t => t.id !== id));
      this.totalCount.update(c => c - 1);
      this.toastService.success('Ticket deleted successfully');
      return this.success(null, 'Ticket deleted');
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async assignTicket(ticketId: string, assigneeId: string | null): Promise<ApiResponse<null>> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await this.client
        .from('tickets')
        .update({ assignee_id: assigneeId, updated_by: userId })
        .eq('id', ticketId);

      if (error) throw error;
      this.toastService.success(assigneeId ? 'Ticket assigned successfully' : 'Ticket unassigned');
      return this.success(null);
    } catch (err) {
      return this.handleError(err);
    }
  }

  async transitionStatus(ticketId: string, newStatusId: string): Promise<ApiResponse<null>> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await this.client
        .from('tickets')
        .update({ status_id: newStatusId, updated_by: userId })
        .eq('id', ticketId);

      if (error) throw error;
      this.toastService.success('Status updated successfully');
      return this.success(null);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r;
    }
  }
}
