/**
 * Smoke test — valida que endpoints públicos respondem com <500ms p99.
 * 1 VU por 30s. Roda em todo deploy novo.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API_BASE || 'http://localhost:3000/api/v1';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(99)<500'],
    http_req_failed: ['rate<0.01'], // <1% falhas
  },
};

export default function () {
  // Endpoints públicos — não precisam auth
  const health = http.get(`${API}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const programs = http.get(`${API}/programs`);
  check(programs, {
    'programs 200': (r) => r.status === 200,
    'programs has data': (r) => {
      try {
        return JSON.parse(r.body).length > 0 || JSON.parse(r.body).data;
      } catch {
        return false;
      }
    },
  });

  const alliances = http.get(`${API}/travel-intel/alliances`);
  check(alliances, { 'alliances 200': (r) => r.status === 200 });

  sleep(1);
}
