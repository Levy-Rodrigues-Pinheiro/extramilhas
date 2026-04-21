/**
 * Stress test — encontra o breaking point. 0 → 200 VUs em 10 min.
 * NÃO roda em prod — só em staging/preview ou scale testing.
 *
 * Usa com: k6 run --out json=stress.json load-tests/stress.js
 * Depois analisa stress.json pra encontrar o ponto onde p99 diverge.
 */
import http from 'k6/http';
import { sleep } from 'k6';

const API = __ENV.API_BASE || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '3m', target: 150 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  // Sem thresholds duros — stress test pode falhar, ok
  thresholds: {
    http_req_duration: ['p(99)<5000'], // safe line — acima disso é crash
  },
};

export default function () {
  http.get(`${API}/programs`);
  http.get(`${API}/arbitrage/transfer-bonuses`);
  sleep(0.5);
}
