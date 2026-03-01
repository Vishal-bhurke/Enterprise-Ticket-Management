import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  template: `
    <div
      class="bg-white rounded-xl border border-surface-200 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
      [class.cursor-pointer]="!!clickable"
    >
      @if (loading) {
        <p-skeleton width="4rem" height="1rem" />
        <p-skeleton width="6rem" height="2rem" />
        <p-skeleton width="8rem" height="1rem" />
      } @else {
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-surface-500">{{ label }}</span>
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center"
            [style.backgroundColor]="iconBg || '#EFF6FF'"
          >
            <i [class]="icon + ' text-lg'" [style.color]="iconColor || '#3B82F6'"></i>
          </div>
        </div>
        <div class="flex items-end gap-2">
          <span class="text-3xl font-bold text-surface-900">{{ value }}</span>
          @if (unit) {
            <span class="text-surface-500 text-sm mb-1">{{ unit }}</span>
          }
        </div>
        @if (change !== undefined) {
          <div class="flex items-center gap-1 text-xs">
            <i
              [class]="change >= 0 ? 'pi pi-trending-up text-green-500' : 'pi pi-trending-down text-red-500'"
            ></i>
            <span [class]="change >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ Math.abs(change) }}% vs last period
            </span>
          </div>
        }
        @if (subtitle) {
          <p class="text-xs text-surface-400">{{ subtitle }}</p>
        }
      }
    </div>
  `,
})
export class MetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input() value: number | string = 0;
  @Input() unit?: string;
  @Input() icon = 'pi pi-chart-bar';
  @Input() iconColor?: string;
  @Input() iconBg?: string;
  @Input() change?: number;
  @Input() subtitle?: string;
  @Input() loading = false;
  @Input() clickable = false;

  protected readonly Math = Math;
}
