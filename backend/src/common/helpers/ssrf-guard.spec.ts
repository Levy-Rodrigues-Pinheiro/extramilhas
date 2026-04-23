import { assertSafeExternalUrl, SSRFViolation } from './ssrf-guard';

/**
 * Tests pro SSRF guard (bug fix SR-SSRF).
 * Cenários: literal IPs privados, DNS resolution, schemes, hostnames reservados.
 */
describe('SSRFGuard', () => {
  const origEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
  });
  afterAll(() => {
    process.env.NODE_ENV = origEnv;
  });

  describe('schemes', () => {
    it('permite https', async () => {
      await expect(assertSafeExternalUrl('https://example.com/webhook')).resolves.toBeTruthy();
    });
    it('permite http', async () => {
      await expect(assertSafeExternalUrl('http://example.com/webhook')).resolves.toBeTruthy();
    });
    it('bloqueia file://', async () => {
      await expect(assertSafeExternalUrl('file:///etc/passwd')).rejects.toThrow(SSRFViolation);
    });
    it('bloqueia gopher://', async () => {
      await expect(assertSafeExternalUrl('gopher://evil.com/')).rejects.toThrow(SSRFViolation);
    });
    it('bloqueia dict://', async () => {
      await expect(assertSafeExternalUrl('dict://localhost:11211')).rejects.toThrow(SSRFViolation);
    });
  });

  describe('IPs privados literais', () => {
    it.each([
      'http://127.0.0.1/',
      'http://127.0.0.1:3001/admin',
      'http://10.0.0.1/',
      'http://172.16.0.1/',
      'http://172.31.255.255/',
      'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data/', // AWS/Fly metadata
      'http://0.0.0.0/',
      'http://100.64.0.1/', // CGNAT
    ])('bloqueia %s', async (url) => {
      await expect(assertSafeExternalUrl(url)).rejects.toThrow(SSRFViolation);
    });

    it('bloqueia IPv6 loopback', async () => {
      await expect(assertSafeExternalUrl('http://[::1]/')).rejects.toThrow(SSRFViolation);
    });
  });

  describe('hostnames reservados', () => {
    it('bloqueia localhost', async () => {
      await expect(assertSafeExternalUrl('http://localhost/')).rejects.toThrow(SSRFViolation);
    });
    it('bloqueia metadata.google.internal', async () => {
      await expect(assertSafeExternalUrl('http://metadata.google.internal/')).rejects.toThrow(
        SSRFViolation,
      );
    });
    it('bloqueia *.local', async () => {
      await expect(assertSafeExternalUrl('http://printer.local/')).rejects.toThrow(SSRFViolation);
    });
    it('bloqueia *.internal', async () => {
      await expect(assertSafeExternalUrl('http://api.internal/')).rejects.toThrow(SSRFViolation);
    });
  });

  describe('URL malformada', () => {
    it('bloqueia string qualquer', async () => {
      await expect(assertSafeExternalUrl('not-a-url')).rejects.toThrow(SSRFViolation);
    });
    it('bloqueia URL sem host', async () => {
      await expect(assertSafeExternalUrl('https://')).rejects.toThrow(SSRFViolation);
    });
  });
});
