import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { SkeletonModule } from 'primeng/skeleton';
import { TicketService } from '../services/ticket.service';
import { AttachmentService } from '../services/attachment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { TicketType, TicketPriority, TicketCategory, Queue, CustomFieldSchema } from '../../../shared/models/ticket.model';
import { Department, Profile } from '../../../shared/models/user.model';
import { CreateTicketDto } from '../../../shared/models/ticket.model';

@Component({
  selector: 'app-ticket-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    CalendarModule,
    SkeletonModule,
    PageHeaderComponent,
    ErrorBannerComponent,
  ],
  template: `
    <app-page-header
      title="Create Ticket"
      subtitle="Submit a new support request"
      [breadcrumbs]="['Home', 'Tickets', 'Create']"
    >
      <p-button
        label="Cancel"
        icon="pi pi-times"
        severity="secondary"
        size="small"
        routerLink="/tickets"
      />
    </app-page-header>

    @if (submitError()) {
      <app-error-banner [message]="submitError()!" />
    }

    <!-- ── Skeleton shown while form options load from Supabase ── -->
    @if (isLoadingOptions()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Main form skeleton -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white rounded-xl border border-surface-200 p-6">
            <div class="flex items-center gap-2 mb-6">
              <p-skeleton width="20px" height="20px" />
              <p-skeleton width="150px" height="18px" />
            </div>
            <div class="space-y-5">
              <!-- Title field -->
              <div>
                <p-skeleton width="80px" height="13px" styleClass="mb-2" />
                <p-skeleton height="42px" />
              </div>
              <!-- Type dropdown -->
              <div>
                <p-skeleton width="100px" height="13px" styleClass="mb-2" />
                <p-skeleton height="42px" />
              </div>
              <!-- Description -->
              <div>
                <p-skeleton width="90px" height="13px" styleClass="mb-2" />
                <p-skeleton height="140px" />
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar skeleton -->
        <div class="space-y-4">
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <p-skeleton width="110px" height="11px" styleClass="mb-5" />
            <div class="space-y-4">
              @for (i of [1,2,3,4]; track i) {
                <div>
                  <p-skeleton width="70px" height="11px" styleClass="mb-1.5" />
                  <p-skeleton height="42px" />
                </div>
              }
            </div>
          </div>
          <!-- Submit button skeleton -->
          <p-skeleton height="44px" borderRadius="8px" />
        </div>

      </div>
    }

    <!-- ── Actual form (hidden while options load, preserving form state) ── -->
    <div [hidden]="isLoadingOptions()" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Form -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Basic Info Card -->
        <div class="bg-white rounded-xl border border-surface-200 p-6">
          <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <i class="pi pi-info-circle text-primary-500"></i>
            Basic Information
          </h3>

          <form [formGroup]="form" class="space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">
                Subject <span class="text-red-500">*</span>
              </label>
              <input
                pInputText
                formControlName="title"
                placeholder="Briefly describe the issue..."
                class="w-full"
                [class.ng-invalid]="isInvalid('title')"
              />
              @if (isInvalid('title')) {
                <p class="text-red-500 text-xs mt-1">Subject is required</p>
              }
            </div>

            <!-- Ticket Type -->
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">
                Ticket Type <span class="text-red-500">*</span>
              </label>
              <p-dropdown
                formControlName="ticket_type_id"
                [options]="ticketTypes()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select ticket type"
                styleClass="w-full"
                [class.ng-invalid]="isInvalid('ticket_type_id')"
                (onChange)="onTicketTypeChange($event.value)"
              />
              @if (isInvalid('ticket_type_id')) {
                <p class="text-red-500 text-xs mt-1">Ticket type is required</p>
              }
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">
                Description
              </label>
              <textarea
                pTextarea
                formControlName="description"
                placeholder="Provide detailed information about the issue, steps to reproduce, and expected behavior..."
                [rows]="6"
                class="w-full"
              ></textarea>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-sm font-medium text-surface-700 mb-1.5">Tags</label>
              <input
                pInputText
                type="text"
                placeholder="e.g. network, vpn, hardware (comma-separated)"
                [(ngModel)]="tagsInput"
                [ngModelOptions]="{standalone: true}"
                (blur)="parseTags()"
                class="w-full"
              />
              @if (parsedTags().length > 0) {
                <div class="flex flex-wrap gap-1.5 mt-2">
                  @for (tag of parsedTags(); track tag) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                      #{{ tag }}
                      <button type="button" (click)="removeTag(tag)" class="hover:text-red-600 ml-1">
                        <i class="pi pi-times text-xs"></i>
                      </button>
                    </span>
                  }
                </div>
              }
              <p class="text-xs text-surface-400 mt-1">Separate multiple tags with commas</p>
            </div>
          </form>
        </div>

        <!-- Custom Fields Card (shown if ticket type has custom fields) -->
        @if (customFields().length > 0) {
          <div class="bg-white rounded-xl border border-surface-200 p-6">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-list text-primary-500"></i>
              Additional Details
            </h3>
            <div class="space-y-4" [formGroup]="customFieldsForm">
              @for (field of customFields(); track field.key) {
                <div>
                  <label class="block text-sm font-medium text-surface-700 mb-1.5">
                    {{ field.label }}
                    @if (field.required) { <span class="text-red-500">*</span> }
                  </label>
                  @if (field.type === 'text') {
                    <input pInputText [formControlName]="field.key" class="w-full" />
                  } @else if (field.type === 'number') {
                    <input pInputText type="number" [formControlName]="field.key" class="w-full" />
                  } @else if (field.type === 'select' && field.options) {
                    <p-dropdown
                      [formControlName]="field.key"
                      [options]="field.options"
                      optionLabel="label"
                      optionValue="value"
                      styleClass="w-full"
                    />
                  } @else if (field.type === 'date') {
                    <p-calendar
                      [formControlName]="field.key"
                      dateFormat="yy-mm-dd"
                      styleClass="w-full"
                    />
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Attachments Card -->
        <div class="bg-white rounded-xl border border-surface-200 p-6">
          <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <i class="pi pi-paperclip text-primary-500"></i>
            Attachments
          </h3>
          <div
            class="border-2 border-dashed border-surface-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
            (click)="fileInput.click()"
            (dragover)="$event.preventDefault()"
            (drop)="onFileDrop($event)"
          >
            <i class="pi pi-upload text-4xl text-surface-300 mb-3"></i>
            <p class="text-sm text-surface-600 font-medium">Click to upload or drag & drop</p>
            <p class="text-xs text-surface-400 mt-1">Max 10MB per file</p>
            <input #fileInput type="file" multiple class="hidden" (change)="onFileSelect($event)" />
          </div>
          @if (pendingFiles().length > 0) {
            <div class="mt-3 space-y-2">
              @for (file of pendingFiles(); track file.name) {
                <div class="flex items-center gap-3 p-2 bg-surface-50 rounded-lg">
                  <i class="pi pi-file text-surface-500"></i>
                  <span class="text-sm flex-1 text-surface-700">{{ file.name }}</span>
                  <span class="text-xs text-surface-400">{{ formatFileSize(file.size) }}</span>
                  <button
                    type="button"
                    class="text-red-400 hover:text-red-600 transition-colors"
                    (click)="removePendingFile(file)"
                  >
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Sidebar Panel -->
      <div class="space-y-4">

        <!-- Classification Card -->
        <div class="bg-white rounded-xl border border-surface-200 p-5">
          <h3 class="font-semibold text-surface-800 mb-4 text-sm uppercase tracking-wide text-surface-500">
            Classification
          </h3>
          <form [formGroup]="form" class="space-y-3">

            <!-- Priority -->
            <div>
              <label class="block text-xs font-medium text-surface-600 mb-1">
                Priority <span class="text-red-500">*</span>
              </label>
              <p-dropdown
                formControlName="priority_id"
                [options]="priorities()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select priority"
                styleClass="w-full"
              />
            </div>

            <!-- Category -->
            <div>
              <label class="block text-xs font-medium text-surface-600 mb-1">Category</label>
              <p-dropdown
                formControlName="category_id"
                [options]="categories()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select category"
                [showClear]="true"
                styleClass="w-full"
              />
            </div>

            <!-- Department -->
            <div>
              <label class="block text-xs font-medium text-surface-600 mb-1">Department</label>
              <p-dropdown
                formControlName="department_id"
                [options]="departments()"
                optionLabel="name"
                optionValue="id"
                placeholder="Select department"
                [showClear]="true"
                styleClass="w-full"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label class="block text-xs font-medium text-surface-600 mb-1">Due Date</label>
              <p-calendar
                formControlName="due_date"
                placeholder="Select date"
                dateFormat="yy-mm-dd"
                [minDate]="today"
                styleClass="w-full"
              />
            </div>
          </form>
        </div>

        <!-- Assignment Card (admin/agent only) -->
        @if (canAssign()) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="font-semibold text-surface-800 mb-4 text-sm uppercase tracking-wide text-surface-500">
              Assignment
            </h3>
            <form [formGroup]="form" class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-surface-600 mb-1">Assign to Agent</label>
                <p-dropdown
                  formControlName="assignee_id"
                  [options]="agents()"
                  optionLabel="full_name"
                  optionValue="id"
                  placeholder="Unassigned"
                  [showClear]="true"
                  [filter]="true"
                  filterBy="full_name"
                  styleClass="w-full"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-surface-600 mb-1">Queue</label>
                <p-dropdown
                  formControlName="queue_id"
                  [options]="queues()"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="No queue"
                  [showClear]="true"
                  styleClass="w-full"
                />
              </div>
            </form>
          </div>
        }

        <!-- Submit -->
        <p-button
          label="Submit Ticket"
          icon="pi pi-send"
          [loading]="isSubmitting()"
          [disabled]="form.invalid || isSubmitting()"
          styleClass="w-full"
          (onClick)="submit()"
        />
      </div>
    </div>
  `,
})
export class TicketCreateComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private attachmentService = inject(AttachmentService);
  private authService = inject(AuthService);
  private supabase = inject(SUPABASE_CLIENT);

  protected canAssign = this.authService.canManageTickets;
  protected isSubmitting = this.ticketService.isSubmitting;
  protected isLoadingOptions = signal(true);
  protected today = new Date();

  // Option signals
  protected ticketTypes = signal<TicketType[]>([]);
  protected priorities = signal<TicketPriority[]>([]);
  protected categories = signal<TicketCategory[]>([]);
  protected departments = signal<Department[]>([]);
  protected agents = signal<Partial<Profile>[]>([]);
  protected queues = signal<Queue[]>([]);
  protected customFields = signal<CustomFieldSchema[]>([]);
  protected pendingFiles = signal<File[]>([]);
  protected submitError = signal<string | null>(null);
  protected tagsInput = '';
  protected parsedTags = signal<string[]>([]);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    ticket_type_id: ['', Validators.required],
    description: [''],
    priority_id: ['', Validators.required],
    category_id: [''],
    department_id: [''],
    queue_id: [''],
    assignee_id: [''],
    due_date: [null as Date | null],
  });

  customFieldsForm = this.fb.group({});

  ngOnInit(): void {
    this.loadOptions();
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  protected onTicketTypeChange(typeId: string): void {
    const type = this.ticketTypes().find(t => t.id === typeId);
    const fields = type?.custom_field_schema ?? [];
    this.customFields.set(fields);

    // Rebuild custom fields form
    const group: Record<string, unknown> = {};
    for (const field of fields) {
      group[field.key] = [null, field.required ? Validators.required : []];
    }
    this.customFieldsForm = this.fb.group(group);
  }

  protected parseTags(): void {
    const tags = this.tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
    const unique = [...new Set([...this.parsedTags(), ...tags])];
    this.parsedTags.set(unique);
    this.tagsInput = '';
  }

  protected removeTag(tag: string): void {
    this.parsedTags.update(tags => tags.filter(t => t !== tag));
  }

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
  }

  protected onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  private addFiles(files: File[]): void {
    const filtered = files.filter(f => f.size <= 10 * 1024 * 1024); // 10MB limit
    this.pendingFiles.update(list => [...list, ...filtered]);
  }

  protected removePendingFile(file: File): void {
    this.pendingFiles.update(list => list.filter(f => f !== file));
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitError.set(null);
    const v = this.form.value;

    const dto: CreateTicketDto = {
      title: v.title!,
      ticket_type_id: v.ticket_type_id!,
      priority_id: v.priority_id!,
      description: v.description || undefined,
      category_id: v.category_id || undefined,
      department_id: v.department_id || undefined,
      queue_id: v.queue_id || undefined,
      assignee_id: v.assignee_id || undefined,
      due_date: v.due_date ? (v.due_date as Date).toISOString().split('T')[0] : undefined,
      tags: this.parsedTags(),
      source: 'web',
    };

    // Merge custom fields
    const customValues = this.customFieldsForm.value;
    if (Object.keys(customValues).length > 0) {
      dto.custom_fields = customValues as Record<string, unknown>;
    }

    const result = await this.ticketService.createTicket(dto);
    if (!result.success) {
      this.submitError.set(result.message);
      return;
    }

    const ticket = result.data!;

    // Upload pending attachments
    if (this.pendingFiles().length > 0) {
      await Promise.allSettled(
        this.pendingFiles().map(file => this.attachmentService.uploadAttachment(ticket.id, file))
      );
    }

    this.router.navigate(['/tickets', ticket.id]);
  }

  private async loadOptions(): Promise<void> {
    this.isLoadingOptions.set(true);
    try {
    const [typeRes, priorityRes, categoryRes, deptRes, agentRes, queueRes] = await Promise.all([
      this.supabase.from('ticket_types').select('id, name, slug, icon, custom_field_schema, is_active, default_priority_id, default_workflow_id, description').eq('is_active', true).order('name'),
      this.supabase.from('priorities').select('id, name, slug, color, level, icon, sla_multiplier, is_active').eq('is_active', true).order('level'),
      this.supabase.from('categories').select('id, name, code, description, parent_id, is_active').eq('is_active', true).order('name'),
      this.supabase.from('departments').select('id, name, code, head_id, parent_id').order('name'),
      this.supabase.from('profiles').select('id, full_name, email, avatar_url').eq('is_active', true).order('full_name'),
      this.supabase.from('queues').select('id, name, description, team_lead_id, is_active').eq('is_active', true).order('name'),
    ]);

    if (typeRes.data) this.ticketTypes.set(typeRes.data as TicketType[]);
    if (priorityRes.data) {
      this.priorities.set(priorityRes.data as TicketPriority[]);
      // Set default priority (medium = level 3)
      const medium = priorityRes.data.find((p: { level: number }) => p.level === 3);
      if (medium) this.form.patchValue({ priority_id: medium.id });
    }
    if (categoryRes.data) this.categories.set(categoryRes.data as TicketCategory[]);
    if (deptRes.data) this.departments.set(deptRes.data as Department[]);
    if (agentRes.data) this.agents.set(agentRes.data as Partial<Profile>[]);
    if (queueRes.data) this.queues.set(queueRes.data as Queue[]);
    } finally {
      this.isLoadingOptions.set(false);
    }
  }
}
