import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { TicketAttachment } from '../../../shared/models/ticket.model';
import { ApiResponse } from '../../../shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AttachmentService extends SupabaseService {
  private toastService = inject(ToastService);

  readonly isUploading = signal(false);
  readonly uploadProgress = signal(0);

  private readonly BUCKET = 'ticket-attachments';

  async uploadAttachment(
    ticketId: string,
    file: File
  ): Promise<ApiResponse<TicketAttachment | null>> {
    this.isUploading.set(true);
    this.uploadProgress.set(0);

    try {
      const userId = await this.getCurrentUserId();
      const ext = file.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await this.client.storage
        .from(this.BUCKET)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      this.uploadProgress.set(80);

      // Insert metadata record
      const { data, error } = await this.client
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          storage_path: storageData.path,
          uploaded_by: userId,
          created_by: userId,
        })
        .select(`
          id, file_name, file_size, mime_type, storage_path, created_at, ticket_id,
          uploader:profiles!uploaded_by(id, full_name)
        `)
        .single();

      if (error) throw error;

      this.uploadProgress.set(100);
      this.toastService.success(`${file.name} uploaded`);
      return this.success(data as unknown as TicketAttachment);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r as ApiResponse<null>;
    } finally {
      this.isUploading.set(false);
      setTimeout(() => this.uploadProgress.set(0), 1000);
    }
  }

  async deleteAttachment(attachment: TicketAttachment): Promise<ApiResponse<null>> {
    try {
      // Remove from storage
      await this.client.storage.from(this.BUCKET).remove([attachment.storage_path]);

      // Remove metadata
      const { error } = await this.client.from('ticket_attachments').delete().eq('id', attachment.id);
      if (error) throw error;

      this.toastService.success('Attachment deleted');
      return this.success(null);
    } catch (err) {
      const r = this.handleError(err);
      this.toastService.error(r.message);
      return r;
    }
  }

  getPublicUrl(storagePath: string): string {
    const { data } = this.client.storage.from(this.BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType === 'application/pdf') return 'pi pi-file-pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'pi pi-file-excel';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi pi-file-word';
    if (mimeType.startsWith('video/')) return 'pi pi-video';
    if (mimeType.startsWith('audio/')) return 'pi pi-volume-up';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'pi pi-file-archive';
    return 'pi pi-file';
  }
}
