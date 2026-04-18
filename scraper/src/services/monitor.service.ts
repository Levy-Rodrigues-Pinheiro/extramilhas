import logger from '../logger';

interface PriceSnapshot {
  programSlug: string;
  route: string; // "GRU-MIA"
  milesRequired: number;
  timestamp: number;
}

interface PriceChange {
  programSlug: string;
  route: string;
  oldMiles: number;
  newMiles: number;
  changePercent: number;
  direction: 'UP' | 'DOWN';
  timestamp: string;
}

export class MonitorService {
  private static snapshots = new Map<string, PriceSnapshot[]>();
  private static changes: PriceChange[] = [];

  /** Record a price snapshot */
  static recordPrice(programSlug: string, origin: string, destination: string, miles: number): void {
    const route = `${origin}-${destination}`;
    const key = `${programSlug}-${route}`;

    if (!this.snapshots.has(key)) {
      this.snapshots.set(key, []);
    }

    const history = this.snapshots.get(key)!;
    const last = history[history.length - 1];

    // Only record if different from last snapshot
    if (!last || last.milesRequired !== miles) {
      history.push({ programSlug, route, milesRequired: miles, timestamp: Date.now() });

      // Detect significant change (>5%)
      if (last && last.milesRequired > 0) {
        const changePercent = ((miles - last.milesRequired) / last.milesRequired) * 100;
        if (Math.abs(changePercent) >= 5) {
          const change: PriceChange = {
            programSlug,
            route,
            oldMiles: last.milesRequired,
            newMiles: miles,
            changePercent: Math.round(changePercent * 10) / 10,
            direction: changePercent > 0 ? 'UP' : 'DOWN',
            timestamp: new Date().toISOString(),
          };
          this.changes.push(change);

          logger.info(`[Monitor] Price ${change.direction}: ${programSlug} ${route} ${last.milesRequired}→${miles} milhas (${changePercent > 0 ? '+' : ''}${change.changePercent}%)`);
        }
      }

      // Keep only last 100 snapshots per route
      if (history.length > 100) history.shift();
    }
  }

  /** Get recent price changes */
  static getRecentChanges(limit = 20): PriceChange[] {
    return this.changes.slice(-limit);
  }

  /** Get price trend for a route */
  static getTrend(programSlug: string, origin: string, destination: string): { trend: 'UP' | 'DOWN' | 'STABLE'; avgMiles: number } {
    const key = `${programSlug}-${origin}-${destination}`;
    const history = this.snapshots.get(key) || [];

    if (history.length < 2) return { trend: 'STABLE', avgMiles: history[0]?.milesRequired || 0 };

    const recent = history.slice(-5);
    const avg = recent.reduce((s, h) => s + h.milesRequired, 0) / recent.length;
    const first = recent[0].milesRequired;
    const last = recent[recent.length - 1].milesRequired;

    const change = ((last - first) / first) * 100;
    const trend = change > 3 ? 'UP' : change < -3 ? 'DOWN' : 'STABLE';

    return { trend, avgMiles: Math.round(avg) };
  }

  /** Get stats */
  static getStats() {
    return {
      routesTracked: this.snapshots.size,
      totalSnapshots: Array.from(this.snapshots.values()).reduce((s, h) => s + h.length, 0),
      recentChanges: this.changes.length,
    };
  }
}
