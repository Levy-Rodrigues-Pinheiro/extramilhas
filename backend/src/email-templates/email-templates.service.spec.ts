import { Test } from '@nestjs/testing';
import { EmailTemplatesService } from './email-templates.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Specialist review fix #SR-15: render placeholder safety.
 * Tests garantem placeholder não-resolvido vira '' + warn.
 */
describe('EmailTemplatesService.render', () => {
  let service: EmailTemplatesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailTemplatesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = module.get<EmailTemplatesService>(EmailTemplatesService);
  });

  it('substitui {{user.name}} pelo valor', () => {
    const result = service.render('Olá {{user.name}}!', { user: { name: 'Ana' } });
    expect(result).toBe('Olá Ana!');
  });

  it('substitui múltiplos placeholders', () => {
    const result = service.render(
      'Oi {{user.name}}, plano {{user.plan}} expira em {{days}}d',
      { user: { name: 'Ana', plan: 'PREMIUM' }, days: 7 },
    );
    expect(result).toBe('Oi Ana, plano PREMIUM expira em 7d');
  });

  it('placeholder não-resolvido vira string vazia (não vaza {{}} no email)', () => {
    const result = service.render('Olá {{user.name}}!', {});
    expect(result).toBe('Olá !');
    expect(result).not.toContain('{{');
  });

  it('strictMode=true throws em placeholder missing', () => {
    expect(() =>
      service.render('Olá {{user.name}}!', {}, { strictMode: true }),
    ).toThrow(/Placeholders não resolvidos/);
  });

  it('null/undefined vira string vazia', () => {
    const result = service.render('{{a}}-{{b}}', { a: null, b: undefined });
    expect(result).toBe('-');
  });

  it('aceita números e booleans', () => {
    const result = service.render('{{n}} - {{b}}', { n: 42, b: true });
    expect(result).toBe('42 - true');
  });

  it('paths nested funcionam', () => {
    const result = service.render('{{a.b.c}}', { a: { b: { c: 'deep' } } });
    expect(result).toBe('deep');
  });

  it('path inválido em meio (a.b.c onde b é null) vira vazio', () => {
    const result = service.render('{{a.b.c}}', { a: { b: null } });
    expect(result).toBe('');
  });

  it('regex aceita underscore em paths', () => {
    const result = service.render('{{user_name}}', { user_name: 'Ana' });
    expect(result).toBe('Ana');
  });
});
