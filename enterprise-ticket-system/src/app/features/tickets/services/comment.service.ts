import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { TicketComment } from '../../../shared/models/ticket.model';
import { ApiResponse } from '../../../shared/models/api-response.model';

export interface CreateCommentDto {
  ticket_id: string;
  body: string;
  is_internal?: boolean;
  mentions?: string[];
}

@Injectable({ providedIn: 'root' })
export class CommentService extends SupabaseService {
  private toastService = inject(ToastService);

  readonly isSubmitting = signal(false);

  async addComment(dto: CreateCommentDto): Promise<ApiResponse<TicketComment | null>> {
    this.isSubmitting.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await this.client
        .from('ticket_comments')
        .insert({
          ticket_id: dto.ticket_id,
          body: dto.body,
          is_internal: dto.is_internal ?? false,
          mentions: dto.mentions ?? [],
          author_id: userId,
          created_by: userId,
        })
        .select(`
          id, body, is_internal, mentions, created_at, updated_at, ticket_id,
          author:profiles!author_id(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      this.toastService.success('Comment added');
      return this.success(data as unknown as TicketComment);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteComment(commentId: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.from('ticket_comments').delete().eq('id', commentId);
      if (error) throw error;
      this.toastService.success('Comment deleted');
      return this.success(null);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r;
    }
  }

  async updateComment(commentId: string, body: string): Promise<ApiResponse<TicketComment | null>> {
    this.isSubmitting.set(true);
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await this.client
        .from('ticket_comments')
        .update({ body, updated_by: userId })
        .eq('id', commentId)
        .select(`
          id, body, is_internal, mentions, created_at, updated_at, ticket_id,
          author:profiles!author_id(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return this.success(data as unknown as TicketComment);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
