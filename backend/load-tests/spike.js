/**
 * Spike test — simula viralização / ad spike. 0 → 500 VUs em 30s,
 * sustém 1 min, volta pra 0. Mede:
 *   - App sobrevive sem crash?
 *   - Recovery: p99 volta pro normal depois?
 *   - Rate limiter pega o excesso sem derrubar tudo?
 *
 * Expectativa: thresholds frouxos (p99 < 2000ms), <5% falhas. Tudo acima
 * disso indica precisa de scaling up ou otimização urgente.
 */
import http from 'k6/http';
import { sleep } from 'k6';

const API = __ENV.API_BASE || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '10s', target: 500 },
    { duration: '1m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'],
    http_req_failed: ['rate<0.05'], // 5% de falha tolerável no spike
  },
};

export default function () {
  http.get(`${API}/programs`);
  http.get(`${API}/arbitrage/transfer-bonuses`); // hot path crítico
  sleep(Math.random());
}
