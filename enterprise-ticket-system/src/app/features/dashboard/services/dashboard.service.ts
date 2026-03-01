import { Injectable, signal, computed } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  pending: number;
  resolved: number;
  closed: number;
  sla_breached: number;
  escalated: number;
}

export interface AgentWorkload {
  agent_id: string;
  agent_name: string;
  avatar_url: string | null;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_today: number;
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService extends SupabaseService {
  readonly stats = signal<DashboardStats>({
    total: 0, open: 0, in_progress: 0, pending: 0,
    resolved: 0, closed: 0, sla_breached: 0, escalated: 0,
  });
  readonly agentWorkload = signal<AgentWorkload[]>([]);
  readonly trendData = signal<TrendPoint[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly slaBreachRate = computed(() => {
    const s = this.stats();
    if (s.total === 0) return 0;
    return Math.round((s.sla_breached / s.total) * 100);
  });

  async loadDashboard(roleSlug: string, userId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadStats(roleSlug, userId),
        this.loadAgentWorkload(roleSlug, userId),
        this.loadTrend(),
      ]);
    } catch (err) {
      const r = this.handleError(err);
      this.error.set(r.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStats(roleSlug: string, userId: string): Promise<void> {
    if (!userId) {
      this.stats.set({ total: 0, open: 0, in_progress: 0, pending: 0, resolved: 0, closed: 0, sla_breached: 0, escalated: 0 });
      return;
    }

    let query = this.client.from('tickets').select(`
      id,
      status:statuses!status_id(category),
      is_escalated,
      sla_resolve_met
    `);

    // Filter by role
    if (roleSlug === 'agent') {
      query = query.or(`assignee_id.eq.${userId}`);
    } else if (roleSlug === 'end_user') {
      query = query.eq('requester_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tickets: any[] = data || [];

    const getCategory = (t: { status: unknown }) => {
      const s = t.status;
      if (Array.isArray(s)) return (s[0] as { category: string })?.category ?? '';
      return (s as { category: string })?.category ?? '';
    };

    const stats: DashboardStats = {
      total: tickets.length,
      open: tickets.filter(t => getCategory(t) === 'open').length,
      in_progress: tickets.filter(t => getCategory(t) === 'in_progress').length,
      pending: tickets.filter(t => getCategory(t) === 'pending').length,
      resolved: tickets.filter(t => getCategory(t) === 'resolved').length,
      closed: tickets.filter(t => getCategory(t) === 'closed').length,
      sla_breached: tickets.filter(t => t.sla_resolve_met === false).length,
      escalated: tickets.filter(t => t.is_escalated === true).length,
    };

    this.stats.set(stats);
  }

  private async loadAgentWorkload(roleSlug: string, userId: string): Promise<void> {
    if (!userId || roleSlug === 'end_user') {
      this.agentWorkload.set([]);
      return;
    }

    const { data, error } = await this.client
      .from('tickets')
      .select(`
        assignee_id,
        assignee:profiles!assignee_id(id, full_name, avatar_url),
        status:statuses!status_id(category)
      `)
      .not('assignee_id', 'is', null);

    if (error) throw error;

    const workloadMap = new Map<string, AgentWorkload>();
    for (const ticket of data || []) {
      if (!ticket.assignee_id || !ticket.assignee) continue;
      const agentId = ticket.assignee_id;

      if (!workloadMap.has(agentId)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assignee: any = Array.isArray(ticket.assignee) ? ticket.assignee[0] : ticket.assignee;
        workloadMap.set(agentId, {
          agent_id: agentId,
          agent_name: assignee?.full_name ?? '',
          avatar_url: assignee?.avatar_url ?? null,
          open_tickets: 0,
          in_progress_tickets: 0,
          resolved_today: 0,
        });
      }

      const wl = workloadMap.get(agentId)!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statusObj: any = Array.isArray(ticket.status) ? ticket.status[0] : ticket.status;
      const category: string = statusObj?.category ?? '';
      if (category === 'open') wl.open_tickets++;
      if (category === 'in_progress') wl.in_progress_tickets++;
    }

    this.agentWorkload.set(
      Array.from(workloadMap.values())
        .sort((a, b) => (b.open_tickets + b.in_progress_tickets) - (a.open_tickets + a.in_progress_tickets))
        .slice(0, 10)
    );
  }

  private async loadTrend(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.client
      .from('tickets')
      .select('created_at, resolved_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const trendMap = new Map<string, { created: number; resolved: number }>();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, { created: 0, resolved: 0 });
    }

    for (const ticket of data || []) {
      const createdDay = ticket.created_at?.split('T')[0];
      if (createdDay && trendMap.has(createdDay)) {
        trendMap.get(createdDay)!.created++;
      }
      if (ticket.resolved_at) {
        const resolvedDay = ticket.resolved_at.split('T')[0];
        if (resolvedDay && trendMap.has(resolvedDay)) {
          trendMap.get(resolvedDay)!.resolved++;
        }
      }
    }

    this.trendData.set(
      Array.from(trendMap.entries()).map(([date, counts]) => ({ date, ...counts }))
    );
  }
}
