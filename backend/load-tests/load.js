/**
 * Load test — 50 VUs concorrentes durante 5 min (ramp 1 min up).
 * Simula ~100 req/s sustentados. Mede p95/p99 e falhas.
 *
 * Thresholds duros:
 *   - p99 < 800ms (UX aceitável em pior caso)
 *   - <0.5% falhas (prod qualidade)
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';

const API = __ENV.API_BASE || 'http://localhost:3000/api/v1';
const AUTH = __ENV.API_AUTH_TOKEN || '';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up
    { duration: '3m', target: 50 },   // sustain
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.005'],
  },
};

const headers = AUTH
  ? { Authorization: `Bearer ${AUTH}`, 'Content-Type': 'application/json' }
  : { 'Content-Type': 'application/json' };

export default function () {
  group('public', () => {
    http.get(`${API}/programs`);
    http.get(`${API}/travel-intel/alliances`);
  });

  if (AUTH) {
    group('authenticated hot paths', () => {
      const wallet = http.get(`${API}/users/wallet/summary`, { headers });
      check(wallet, { 'wallet ok': (r) => r.status === 200 });

      const bonuses = http.get(`${API}/arbitrage/transfer-bonuses`, { headers });
      check(bonuses, { 'bonuses ok': (r) => r.status === 200 });

      const streak = http.get(`${API}/engagement/streak`, { headers });
      check(streak, { 'streak ok': (r) => r.status === 200 });
    });
  }

  sleep(Math.random() * 2); // jitter pra não sincronizar VUs
}
