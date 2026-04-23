/**
 * SSRF (Server-Side Request Forgery) guard.
 *
 * Bloqueia URLs que apontem para:
 *  - IPs privados (RFC1918, loopback, link-local)
 *  - IP da metadata cloud (169.254.169.254)
 *  - Schemes não-http(s) (file://, gopher://, dict://…)
 *  - Hosts especiais (localhost, *.local, *.internal)
 *
 * Bug fix HONEST_TEST_REPORT #SR-SSRF-01 (outbound webhooks) e #SR-SSRF-02
 * (intel-agent preview). Antes, user podia apontar URL pra rede interna.
 *
 * IMPORTANTE: faz resolução DNS — não basta checar o hostname literal.
 * Atacante pode registrar `evil.com` apontando pra `127.0.0.1`.
 */
import { promises as dns } from 'dns';

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [ipToInt('10.0.0.0'), ipToInt('10.255.255.255')],
  [ipToInt('172.16.0.0'), ipToInt('172.31.255.255')],
  [ipToInt('192.168.0.0'), ipToInt('192.168.255.255')],
  [ipToInt('127.0.0.0'), ipToInt('127.255.255.255')],
  [ipToInt('169.254.0.0'), ipToInt('169.254.255.255')], // link-local + metadata
  [ipToInt('0.0.0.0'), ipToInt('0.255.255.255')], // "this host"
  [ipToInt('100.64.0.0'), ipToInt('100.127.255.255')], // CGNAT
];

const BLOCKED_HOSTNAMES_EXACT = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
]);

const BLOCKED_HOSTNAME_SUFFIXES = ['.local', '.internal', '.localdomain'];

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const intVal = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([lo, hi]) => intVal >= lo && intVal <= hi);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // loopback, link-local, unique-local, v4-mapped loopback
  return (
    lower === '::1' ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc00:') ||
    lower.startsWith('fd') ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.') ||
    lower.startsWith('::ffff:169.254.')
  );
}

export class SSRFViolation extends Error {
  constructor(reason: string, public url: string) {
    super(`SSRF bloqueado: ${reason} [${url}]`);
  }
}

/**
 * Valida URL pra evitar SSRF. Joga SSRFViolation se suspeito.
 * Em prod, fail-closed: se DNS não resolve, também rejeita.
 * Em dev (NODE_ENV!==production), loga warning mas permite — pra webhooks
 * de teste como webhook.site funcionarem.
 */
export async function assertSafeExternalUrl(
  rawUrl: string,
  opts: { allowDevBypass?: boolean } = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SSRFViolation('URL malformada', rawUrl);
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    throw new SSRFViolation(`scheme proibido (${url.protocol})`, rawUrl);
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname) throw new SSRFViolation('hostname vazio', rawUrl);

  if (BLOCKED_HOSTNAMES_EXACT.has(hostname)) {
    throw new SSRFViolation(`hostname reservado (${hostname})`, rawUrl);
  }
  if (BLOCKED_HOSTNAME_SUFFIXES.some((suf) => hostname.endsWith(suf))) {
    throw new SSRFViolation(`sufixo reservado (${hostname})`, rawUrl);
  }

  // Se hostname já é IP literal, checa direto.
  if (isPrivateIPv4(hostname) || isPrivateIPv6(hostname)) {
    throw new SSRFViolation(`IP privado literal (${hostname})`, rawUrl);
  }

  // DNS resolve: checa TODOS os A/AAAA records. Atacante pode apontar
  // dominio.com pra 127.0.0.1, ou usar DNS rebinding.
  const isDev =
    process.env.NODE_ENV !== 'production' && (opts.allowDevBypass ?? true);

  try {
    const addrs = await dns.lookup(hostname, { all: true, verbatim: true });
    for (const a of addrs) {
      const isPriv = a.family === 4 ? isPrivateIPv4(a.address) : isPrivateIPv6(a.address);
      if (isPriv) {
        throw new SSRFViolation(`resolução DNS aponta pra IP privado (${hostname} → ${a.address})`, rawUrl);
      }
    }
  } catch (err) {
    if (err instanceof SSRFViolation) throw err;
    // DNS lookup falhou (NXDOMAIN, timeout). Em dev permitimos por DX,
    // em prod rejeitamos (fail-closed).
    if (!isDev) {
      throw new SSRFViolation(`DNS lookup falhou (${(err as Error).message})`, rawUrl);
    }
  }

  return url;
}
