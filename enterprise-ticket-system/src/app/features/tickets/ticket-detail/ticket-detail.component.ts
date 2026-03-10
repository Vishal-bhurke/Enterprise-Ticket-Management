import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { TicketService } from '../services/ticket.service';
import { CommentService } from '../services/comment.service';
import { AttachmentService } from '../services/attachment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import {
  TicketDetail, TicketComment, TicketAttachment,
  TicketStatus, TicketPriority, UpdateTicketDto,
} from '../../../shared/models/ticket.model';
import { Profile } from '../../../shared/models/user.model';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ButtonModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    ErrorBannerComponent,
    TimeAgoPipe,
  ],
  template: `
    <!-- Loading skeleton -->
    @if (isLoading()) {
      <div class="space-y-4">
        <p-skeleton height="60px" />
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-4">
            <p-skeleton height="200px" />
            <p-skeleton height="150px" />
          </div>
          <div class="space-y-4">
            <p-skeleton height="300px" />
          </div>
        </div>
      </div>
    }

    @if (error() && !isLoading()) {
      <app-error-banner [message]="error()!" (retry)="loadTicket()" />
    }

    @if (ticket() && !isLoading()) {
      <app-page-header
        [title]="ticket()!.ticket_number"
        [subtitle]="ticket()!.title"
        [breadcrumbs]="['Home', 'Tickets', ticket()!.ticket_number]"
      >
        <div class="flex items-center gap-2">
          @if (ticket()!.is_escalated) {
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
              <i class="pi pi-arrow-up text-xs"></i> Escalated
            </span>
          }
          @if (canManage()) {
            <p-button
              label="Edit"
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              (onClick)="editMode.set(!editMode())"
            />
          }
        </div>
      </app-page-header>

      <!-- Main layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column: Activity + Comments -->
        <div class="lg:col-span-2 space-y-4">

          <!-- Description Card -->
          <div class="bg-white rounded-xl border border-surface-200 p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-surface-800 flex items-center gap-2">
                <i class="pi pi-align-left text-primary-500"></i>
                Description
              </h3>
              <div class="flex items-center gap-2 text-xs text-surface-400">
                <span>Created by</span>
                <strong class="text-surface-600">{{ ticket()!.requester?.full_name ?? 'Unknown' }}</strong>
                <span>·</span>
                <span>{{ ticket()!.created_at | timeAgo }}</span>
              </div>
            </div>
            @if (ticket()!.description) {
              <div class="text-surface-700 text-sm leading-relaxed whitespace-pre-wrap">
                {{ ticket()!.description }}
              </div>
            } @else {
              <p class="text-surface-400 text-sm italic">No description provided.</p>
            }

            @if (ticket()!.tags.length) {
              <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t border-surface-100">
                @for (tag of ticket()!.tags; track tag) {
                  <span class="px-2 py-0.5 bg-surface-100 text-surface-600 rounded text-xs font-medium">
                    #{{ tag }}
                  </span>
                }
              </div>
            }
          </div>

          <!-- Attachments Card -->
          @if (ticket()!.attachments && ticket()!.attachments!.length > 0) {
            <div class="bg-white rounded-xl border border-surface-200 p-6">
              <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <i class="pi pi-paperclip text-primary-500"></i>
                Attachments ({{ ticket()!.attachments!.length }})
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                @for (att of ticket()!.attachments!; track att.id) {
                  <div class="flex items-center gap-2 p-3 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors group">
                    <i [class]="attachmentService.getFileIcon(att.mime_type) + ' text-primary-500 text-lg'"></i>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-surface-800 truncate">{{ att.file_name }}</p>
                      <p class="text-xs text-surface-400">{{ formatBytes(att.file_size) }}</p>
                    </div>
                    <a
                      [href]="attachmentService.getPublicUrl(att.storage_path)"
                      target="_blank"
                      class="opacity-0 group-hover:opacity-100 text-primary-500 hover:text-primary-700 transition-all"
                      pTooltip="Download"
                    >
                      <i class="pi pi-download text-sm"></i>
                    </a>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Comment Editor -->
          <div class="bg-white rounded-xl border border-surface-200 p-6">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-comment text-primary-500"></i>
              Add Comment
            </h3>
            <div class="space-y-3">
              <textarea
                [(ngModel)]="commentBody"
                placeholder="Write your comment or update..."
                rows="4"
                class="w-full p-3 border border-surface-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              ></textarea>
              <div class="flex items-center justify-between">
                @if (canManage()) {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="isInternal" class="rounded" />
                    <span class="text-sm text-surface-600">
                      <i class="pi pi-lock text-xs mr-1 text-amber-500"></i>
                      Internal note (hidden from requester)
                    </span>
                  </label>
                } @else {
                  <span></span>
                }
                <p-button
                  label="Post Comment"
                  icon="pi pi-send"
                  size="small"
                  [loading]="commentService.isSubmitting()"
                  [disabled]="!commentBody.trim() || commentService.isSubmitting()"
                  (onClick)="postComment()"
                />
              </div>
            </div>
          </div>

          <!-- Activity Timeline -->
          <div class="bg-white rounded-xl border border-surface-200 p-6">
            <h3 class="font-semibold text-surface-800 mb-5 flex items-center gap-2">
              <i class="pi pi-history text-primary-500"></i>
              Activity
            </h3>
            @if (!ticket()!.comments || ticket()!.comments!.length === 0) {
              <p class="text-surface-400 text-sm text-center py-6 italic">No activity yet.</p>
            } @else {
              <div class="space-y-4">
                @for (comment of sortedComments(); track comment.id) {
                  <div
                    class="flex gap-3"
                    [class.opacity-75]="comment.is_internal"
                  >
                    <!-- Avatar -->
                    <div class="flex-shrink-0">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        [class]="comment.is_internal ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'"
                      >
                        {{ (comment.author?.full_name ?? 'U').charAt(0).toUpperCase() }}
                      </div>
                    </div>
                    <!-- Content -->
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-semibold text-surface-800">
                          {{ comment.author?.full_name ?? 'Unknown' }}
                        </span>
                        @if (comment.is_internal) {
                          <span class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                            <i class="pi pi-lock text-xs"></i> Internal
                          </span>
                        }
                        <span class="text-xs text-surface-400">{{ comment.created_at | timeAgo }}</span>
                      </div>
                      <div
                        class="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap p-3 rounded-lg border"
                        [class]="comment.is_internal ? 'bg-amber-50 border-amber-200' : 'bg-surface-50 border-surface-200'"
                      >
                        {{ comment.body }}
                      </div>
                      @if (canDeleteComment(comment)) {
                        <button
                          class="mt-1 text-xs text-surface-400 hover:text-red-500 transition-colors"
                          (click)="deleteComment(comment.id)"
                        >
                          Delete
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Right Column: Metadata -->
        <div class="space-y-4">

          <!-- Status + Priority Card -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-4">Status &amp; Priority</h3>
            <div class="space-y-4">
              <!-- Status -->
              <div>
                <label class="block text-xs font-medium text-surface-600 mb-2">Status</label>
                @if (canManage()) {
                  <p-dropdown
                    [options]="statusOptions()"
                    [(ngModel)]="editStatusId"
                    optionLabel="name"
                    optionValue="id"
                    styleClass="w-full"
                    (ngModelChange)="onStatusChange($event)"
                  />
                } @else if (ticket()!.status) {
                  <app-status-badge [status]="ticket()!.status!" />
                }
              </div>
              <!-- Priority -->
              <div>
                <label class="block text-xs font-medium text-surface-600 mb-2">Priority</label>
                @if (canManage()) {
                  <p-dropdown
                    [options]="priorityOptions()"
                    [(ngModel)]="editPriorityId"
                    optionLabel="name"
                    optionValue="id"
                    styleClass="w-full"
                    (ngModelChange)="onPriorityChange($event)"
                  />
                } @else if (ticket()!.priority) {
                  <app-priority-badge [priority]="ticket()!.priority!" />
                }
              </div>
            </div>
          </div>

          <!-- SLA Timer Card -->
          @if (ticket()!.sla_resolve_due) {
            <div class="bg-white rounded-xl border border-surface-200 p-5">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-4">SLA</h3>
              <div class="space-y-3">
                @if (ticket()!.sla_response_due) {
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-xs text-surface-500">First Response</span>
                    <div class="text-right">
                      @if (ticket()!.sla_response_met === true) {
                        <span class="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                          <i class="pi pi-check-circle"></i> Met
                        </span>
                      } @else if (ticket()!.sla_response_met === false) {
                        <span class="text-xs font-semibold text-red-600 flex items-center gap-1 justify-end">
                          <i class="pi pi-times-circle"></i> Breached
                        </span>
                      } @else {
                        <span class="text-xs text-surface-600">{{ formatDueDate(ticket()!.sla_response_due!) }}</span>
                      }
                    </div>
                  </div>
                }
                <div class="flex items-start justify-between gap-2">
                  <span class="text-xs text-surface-500">Resolution</span>
                  <div class="text-right">
                    @if (ticket()!.sla_resolve_met === true) {
                      <span class="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                        <i class="pi pi-check-circle"></i> Met
                      </span>
                    } @else if (ticket()!.sla_resolve_met === false) {
                      <span class="text-xs font-semibold text-red-600 flex items-center gap-1 justify-end">
                        <i class="pi pi-times-circle"></i> Breached
                      </span>
                    } @else {
                      <span
                        class="text-xs font-semibold"
                        [class]="getSlaColorClass(ticket()!.sla_resolve_due!)"
                      >{{ formatDueDate(ticket()!.sla_resolve_due!) }}</span>
                    }
                  </div>
                </div>
                <!-- Countdown bar -->
                @if (!ticket()!.sla_resolve_met && ticket()!.sla_resolve_due) {
                  <div class="mt-2">
                    <div class="w-full bg-surface-100 rounded-full h-1.5">
                      <div
                        class="h-1.5 rounded-full transition-all"
                        [style.width.%]="getSlaProgressPercent(ticket()!.sla_resolve_due!)"
                        [class]="getSlaBarClass(ticket()!.sla_resolve_due!)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Assignment Card -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-4">People</h3>
            <div class="space-y-3">
              <!-- Requester -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-500">Requester</span>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-surface-200 flex items-center justify-center">
                    <span class="text-xs font-bold text-surface-600">
                      {{ (ticket()!.requester?.full_name ?? 'U').charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <span class="text-xs text-surface-700">{{ ticket()!.requester?.full_name ?? '—' }}</span>
                </div>
              </div>

              <!-- Assignee -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-surface-500">Assignee</span>
                @if (editMode() && canManage()) {
                  <p-dropdown
                    [options]="agentOptions()"
                    [(ngModel)]="editAssigneeId"
                    optionLabel="full_name"
                    optionValue="id"
                    placeholder="Unassigned"
                    [showClear]="true"
                    [filter]="true"
                    filterBy="full_name"
                    styleClass="text-xs"
                    (ngModelChange)="updateField('assignee_id', $event)"
                  />
                } @else {
                  <div class="flex items-center gap-2">
                    @if (ticket()!.assignee) {
                      <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <span class="text-xs font-bold text-primary-600">
                          {{ (ticket()!.assignee?.full_name ?? 'U').charAt(0).toUpperCase() }}
                        </span>
                      </div>
                      <span class="text-xs text-surface-700">{{ ticket()!.assignee?.full_name }}</span>
                    } @else {
                      <span class="text-xs text-surface-400 italic">Unassigned</span>
                    }
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Metadata Card -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-4">Details</h3>
            <div class="space-y-2.5 text-xs">
              <div class="flex justify-between">
                <span class="text-surface-500">Ticket #</span>
                <span class="font-mono font-bold text-primary-600">{{ ticket()!.ticket_number }}</span>
              </div>
              @if (ticket()!.ticket_type) {
                <div class="flex justify-between">
                  <span class="text-surface-500">Type</span>
                  <span class="text-surface-700">{{ ticket()!.ticket_type!.name }}</span>
                </div>
              }
              @if (ticket()!.category) {
                <div class="flex justify-between">
                  <span class="text-surface-500">Category</span>
                  <span class="text-surface-700">{{ ticket()!.category!.name }}</span>
                </div>
              }
              @if (ticket()!.department) {
                <div class="flex justify-between">
                  <span class="text-surface-500">Department</span>
                  <span class="text-surface-700">{{ ticket()!.department!.name }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-surface-500">Source</span>
                <span class="text-surface-700 capitalize">{{ ticket()!.source }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-surface-500">Created</span>
                <span class="text-surface-700">{{ ticket()!.created_at | timeAgo }}</span>
              </div>
              @if (ticket()!.due_date) {
                <div class="flex justify-between">
                  <span class="text-surface-500">Due</span>
                  <span class="text-surface-700">{{ formatDueDate(ticket()!.due_date!) }}</span>
                </div>
              }
              @if (ticket()!.resolved_at) {
                <div class="flex justify-between">
                  <span class="text-surface-500">Resolved</span>
                  <span class="text-surface-700">{{ ticket()!.resolved_at | timeAgo }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Danger Zone (admin only) -->
          @if (isAdmin()) {
            <div class="bg-white rounded-xl border border-red-200 p-5">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-red-400 mb-3">Danger Zone</h3>
              <p-button
                label="Delete Ticket"
                icon="pi pi-trash"
                severity="danger"
                [outlined]="true"
                size="small"
                styleClass="w-full"
                (onClick)="confirmDelete()"
              />
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected ticketService = inject(TicketService);
  protected commentService = inject(CommentService);
  protected attachmentService = inject(AttachmentService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private supabase = inject(SUPABASE_CLIENT);

  protected ticket = this.ticketService.selectedTicket;
  protected isLoading = this.ticketService.isLoading;
  protected error = this.ticketService.error;
  protected canManage = this.authService.canManageTickets;
  protected isAdmin = this.authService.isAdmin;

  // Edit mode
  protected editMode = signal(false);
  protected editStatusId = '';
  protected editPriorityId = '';
  protected editAssigneeId: string | null = null;

  // Options for dropdowns
  protected statusOptions = signal<TicketStatus[]>([]);
  protected priorityOptions = signal<TicketPriority[]>([]);
  protected agentOptions = signal<Partial<Profile>[]>([]);

  // Comment state
  protected commentBody = '';
  protected isInternal = false;

  protected sortedComments = computed(() => {
    const t = this.ticket();
    if (!t?.comments) return [];
    const isAgent = this.canManage();
    const comments = isAgent ? t.comments : t.comments.filter(c => !c.is_internal);
    return [...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadTicket(id);
    this.loadDropdownOptions();
  }

  ngOnDestroy(): void {
    this.ticketService.selectedTicket.set(null);
  }

  loadTicket(id?: string): void {
    const ticketId = id ?? this.route.snapshot.paramMap.get('id');
    if (!ticketId) return;
    this.ticketService.getTicketById(ticketId).then(result => {
      if (result.success && result.data) {
        this.editStatusId = result.data.status_id;
        this.editPriorityId = result.data.priority_id;
        this.editAssigneeId = result.data.assignee_id;
      }
    });
  }

  async updateField(field: keyof UpdateTicketDto, value: string | null): Promise<void> {
    const t = this.ticket();
    if (!t) return;
    await this.ticketService.updateTicket(t.id, { [field]: value });
    this.loadTicket(t.id);
  }

  protected onStatusChange(newId: string): void {
    if (!this.ticket() || newId === this.ticket()!.status_id) return;
    this.updateField('status_id', newId);
  }

  protected onPriorityChange(newId: string): void {
    if (!this.ticket() || newId === this.ticket()!.priority_id) return;
    this.updateField('priority_id', newId);
  }

  async postComment(): Promise<void> {
    const t = this.ticket();
    if (!t || !this.commentBody.trim()) return;

    const result = await this.commentService.addComment({
      ticket_id: t.id,
      body: this.commentBody.trim(),
      is_internal: this.isInternal,
    });

    if (result.success && result.data) {
      this.commentBody = '';
      this.isInternal = false;
      // Reload to get updated comments
      this.loadTicket(t.id);
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const result = await this.commentService.deleteComment(commentId);
    if (result.success) {
      const t = this.ticket();
      if (t) this.loadTicket(t.id);
    }
  }

  protected canDeleteComment(comment: TicketComment): boolean {
    const userId = this.authService.currentUser()?.id;
    return this.isAdmin() || comment.author_id === userId;
  }

  confirmDelete(): void {
    const t = this.ticket();
    if (!t) return;
    this.confirmationService.confirm({
      message: `Delete ticket <strong>${t.ticket_number}</strong>? This cannot be undone.`,
      header: 'Delete Ticket',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const result = await this.ticketService.deleteTicket(t.id);
        if (result.success) this.router.navigate(['/tickets']);
      },
    });
  }

  protected formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatDueDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffH = Math.round(diffMs / (1000 * 60 * 60));
    if (diffH < 0) return `Overdue by ${Math.abs(diffH)}h`;
    if (diffH < 1) return 'Due in < 1h';
    if (diffH < 24) return `Due in ${diffH}h`;
    const diffD = Math.round(diffH / 24);
    return `Due in ${diffD}d`;
  }

  protected getSlaColorClass(dueDate: string): string {
    const diffH = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (diffH < 0) return 'text-red-600';
    if (diffH < 2) return 'text-orange-600';
    if (diffH < 8) return 'text-yellow-600';
    return 'text-emerald-600';
  }

  protected getSlaProgressPercent(dueDate: string): number {
    const t = this.ticket();
    if (!t) return 100;
    const created = new Date(t.created_at).getTime();
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    const total = due - created;
    const elapsed = now - created;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }

  protected getSlaBarClass(dueDate: string): string {
    const pct = this.getSlaProgressPercent(dueDate);
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  }

  private async loadDropdownOptions(): Promise<void> {
    const [statusRes, priorityRes, agentRes] = await Promise.all([
      this.supabase.from('statuses').select('id, name, slug, color, category, is_closed').eq('is_active', true).order('sort_order'),
      this.supabase.from('priorities').select('id, name, slug, color, level, icon, sla_multiplier, is_active').eq('is_active', true).order('level'),
      this.supabase.from('profiles').select('id, full_name, email, avatar_url').eq('is_active', true).order('full_name'),
    ]);
    if (statusRes.data) this.statusOptions.set(statusRes.data as TicketStatus[]);
    if (priorityRes.data) this.priorityOptions.set(priorityRes.data as TicketPriority[]);
    if (agentRes.data) this.agentOptions.set(agentRes.data as Partial<Profile>[]);
  }
}
