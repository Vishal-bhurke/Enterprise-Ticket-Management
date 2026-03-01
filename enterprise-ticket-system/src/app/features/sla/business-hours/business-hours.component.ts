import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BusinessHoursItem {
  id: string;
  name: string;
  timezone: string;
  schedule: WeekSchedule;
  created_at: string;
}

interface BusinessHoursForm {
  name: string;
  timezone: string;
  schedule: WeekSchedule;
}

const DAYS: Array<{ key: keyof WeekSchedule; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US/Eastern (UTC-5)', value: 'America/New_York' },
  { label: 'US/Central (UTC-6)', value: 'America/Chicago' },
  { label: 'US/Mountain (UTC-7)', value: 'America/Denver' },
  { label: 'US/Pacific (UTC-8)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (UTC+0)', value: 'Europe/London' },
  { label: 'Europe/Paris (UTC+1)', value: 'Europe/Paris' },
  { label: 'Asia/Kolkata (UTC+5:30)', value: 'Asia/Kolkata' },
  { label: 'Asia/Singapore (UTC+8)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (UTC+9)', value: 'Asia/Tokyo' },
  { label: 'Australia/Sydney (UTC+11)', value: 'Australia/Sydney' },
];

function defaultSchedule(): WeekSchedule {
  return {
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  };
}

@Component({
  selector: 'app-business-hours',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    DropdownModule, TableModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Business Hours"
      subtitle="Define working hours and timezone for SLA calculations"
      [breadcrumbs]="['Home', 'SLA Management', 'Business Hours']"
    >
      @if (isAdmin()) {
        <p-button label="Add Schedule" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    @if (isLoading()) {
      <div class="bg-white rounded-xl border border-surface-200 p-4 space-y-3">
        @for (i of [1,2]; track i) {
          <div class="flex items-center gap-4">
            <p-skeleton width="200px" height="1rem" />
            <p-skeleton width="150px" height="1rem" />
            <p-skeleton width="100px" height="1rem" />
          </div>
        }
      </div>
    }

    @if (!isLoading() && items().length === 0) {
      <app-empty-state icon="pi pi-calendar" title="No business hours configured"
        description="Add a business hours schedule to enable accurate SLA calculations."
        [actionLabel]="isAdmin() ? 'Add Schedule' : undefined"
        (action)="openCreate()" />
    }

    @if (!isLoading() && items().length > 0) {
      <div class="space-y-4">
        @for (item of items(); track item.id) {
          <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div class="p-4 border-b border-surface-100 flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-surface-900">{{ item.name }}</h3>
                <p class="text-xs text-surface-400 mt-0.5">Timezone: {{ item.timezone }}</p>
              </div>
              @if (isAdmin()) {
                <div class="flex items-center gap-1">
                  <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                    size="small" pTooltip="Edit" (onClick)="openEdit(item)" />
                  <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                    size="small" pTooltip="Delete" (onClick)="confirmDelete(item)" />
                </div>
              }
            </div>
            <div class="p-4">
              <div class="grid grid-cols-7 gap-2">
                @for (day of days; track day.key) {
                  <div class="text-center">
                    <p class="text-xs font-medium text-surface-500 mb-1">{{ day.label.slice(0, 3) }}</p>
                    @if (item.schedule[day.key].enabled) {
                      <div class="bg-emerald-50 border border-emerald-200 rounded p-1">
                        <p class="text-xs text-emerald-700 font-medium">{{ item.schedule[day.key].start }}</p>
                        <p class="text-xs text-emerald-500">{{ item.schedule[day.key].end }}</p>
                      </div>
                    } @else {
                      <div class="bg-surface-50 border border-surface-100 rounded p-1">
                        <p class="text-xs text-surface-400">Off</p>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Business Hours' : 'Add Business Hours'"
      [modal]="true" [style]="{ width: '640px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Schedule Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. US Business Hours" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Timezone <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.timezone" [options]="timezones" optionLabel="label"
            optionValue="value" placeholder="Select timezone" class="w-full" />
        </div>
        <div>
          <label class="text-sm font-medium text-surface-700 mb-3 block">Weekly Schedule</label>
          <div class="space-y-2">
            @for (day of days; track day.key) {
              <div class="flex items-center gap-4 p-3 bg-surface-50 rounded-lg">
                <div class="w-28">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <p-toggleswitch [(ngModel)]="form.schedule[day.key].enabled" />
                    <span class="text-sm font-medium text-surface-700">{{ day.label }}</span>
                  </label>
                </div>
                @if (form.schedule[day.key].enabled) {
                  <div class="flex items-center gap-2">
                    <input type="time" [(ngModel)]="form.schedule[day.key].start"
                      class="border border-surface-200 rounded px-2 py-1 text-sm" />
                    <span class="text-surface-400 text-sm">to</span>
                    <input type="time" [(ngModel)]="form.schedule[day.key].end"
                      class="border border-surface-200 rounded px-2 py-1 text-sm" />
                  </div>
                } @else {
                  <span class="text-sm text-surface-400 italic">Closed</span>
                }
              </div>
            }
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name || !form.timezone" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class BusinessHoursComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<BusinessHoursItem[]>([]);

  protected days = DAYS;
  protected timezones = TIMEZONES;
  protected dialogVisible = false;
  protected editingItem: BusinessHoursItem | null = null;
  protected form: BusinessHoursForm = this.defaultForm();

  ngOnInit(): void { this.load(); }

  private defaultForm(): BusinessHoursForm {
    return { name: '', timezone: 'UTC', schedule: defaultSchedule() };
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('business_hours').select('*').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as BusinessHoursItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: BusinessHoursItem): void {
    this.editingItem = item;
    this.form = { name: item.name, timezone: item.timezone, schedule: JSON.parse(JSON.stringify(item.schedule)) };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.timezone) { this.toastService.error('Name and timezone are required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), timezone: this.form.timezone, schedule: this.form.schedule };
      const { error } = this.editingItem
        ? await this.supabase.from('business_hours').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('business_hours').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Schedule updated.' : 'Schedule created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: BusinessHoursItem): void {
    this.confirmationService.confirm({
      message: `Delete schedule <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('business_hours').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Schedule deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
