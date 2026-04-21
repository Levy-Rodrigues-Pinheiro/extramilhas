import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Apple Wallet pass JSON generator.
 *
 * Gera a estrutura pass.json do formato PKPass (Apple Wallet). NÃO assina
 * nem empacota como .pkpass (requer cert Apple + signing). Retorna o JSON
 * que pode ser consumido por serviço de signing externo (ex: passkit.io,
 * ou nossa própria pipeline quando tivermos cert).
 *
 * Alternativa pra mostrar "no wallet": fallback renderiza uma página HTML
 * com layout passkit-like pro user salvar PDF/screenshot.
 *
 * Pass do Milhas Extras é do tipo "storeCard" com:
 *   - Logo + branding
 *   - Campos primary: plan tier (PREMIUM/PRO) + data expiração
 *   - Campos secondary: wallet value estimado + total miles
 *   - Barcode opcional (link pro profile do user)
 */
@Injectable()
export class WalletPassService {
  constructor(private prisma: PrismaService) {}

  async generatePassJson(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        milesBalances: { include: { program: true } },
      },
    });
    if (!user) return null;

    const totalMiles = user.milesBalances.reduce((s, b) => s + b.balance, 0);
    const totalValueBrl = user.milesBalances.reduce(
      (s, b) => s + (b.balance / 1000) * (b.program.avgCpmCurrent || 25),
      0,
    );

    const serialNumber = `ME-${user.id}`;
    const relevantDate = user.subscriptionExpiresAt?.toISOString() ?? null;

    // Schema PKPass simplificado. Production-ready requer passTypeIdentifier
    // + teamIdentifier do Apple Developer cert.
    return {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID ?? 'pass.br.com.milhasextras.member',
      teamIdentifier: process.env.APPLE_TEAM_ID ?? 'REPLACE_WITH_TEAM_ID',
      organizationName: 'Milhas Extras',
      description: 'Cartão de membro',
      serialNumber,
      relevantDate,
      backgroundColor: 'rgb(11, 17, 32)',
      foregroundColor: 'rgb(248, 250, 252)',
      labelColor: 'rgb(148, 163, 184)',
      logoText: 'Milhas Extras',
      storeCard: {
        primaryFields: [
          {
            key: 'plan',
            label: 'Plano',
            value: user.subscriptionPlan,
          },
        ],
        secondaryFields: [
          {
            key: 'wallet_value',
            label: 'Carteira',
            value: `R$ ${totalValueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          },
          {
            key: 'total_miles',
            label: 'Milhas',
            value: totalMiles.toLocaleString('pt-BR'),
          },
        ],
        auxiliaryFields:
          user.subscriptionExpiresAt
            ? [
                {
                  key: 'expires',
                  label: 'Válido até',
                  value: user.subscriptionExpiresAt.toISOString().slice(0, 10),
                },
              ]
            : [],
        backFields: [
          {
            key: 'website',
            label: 'Site',
            value: 'milhasextras.com.br',
          },
          {
            key: 'support',
            label: 'Suporte',
            value: 'ajuda@milhasextras.com.br',
          },
          {
            key: 'terms',
            label: 'Termos',
            value: 'milhasextras.com.br/termos',
          },
        ],
      },
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: `https://milhasextras.com.br/u/${(user as any).publicUsername ?? user.id}`,
          messageEncoding: 'iso-8859-1',
          altText: serialNumber,
        },
      ],
    };
  }

  /**
   * Fallback HTML page com visual de pass. Imprimível / compartilhável.
   */
  async generatePassHtml(userId: string): Promise<string | null> {
    const pass = await this.generatePassJson(userId);
    if (!pass) return null;

    const primary = pass.storeCard.primaryFields[0];
    const wallet = pass.storeCard.secondaryFields[0];
    const miles = pass.storeCard.secondaryFields[1];
    const expires = pass.storeCard.auxiliaryFields[0];

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cartão Milhas Extras</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,system-ui,sans-serif;background:#0B1120;padding:40px 20px;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .pass{width:320px;background:linear-gradient(135deg,#3B82F6,#8B5CF6);border-radius:20px;padding:24px;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  .logo{font-size:11px;font-weight:700;opacity:.9;letter-spacing:1.2px;text-transform:uppercase}
  .plan{font-size:36px;font-weight:800;margin-top:4px}
  .row{display:flex;justify-content:space-between;margin-top:18px;border-top:1px solid rgba(255,255,255,.2);padding-top:14px}
  .col .label{font-size:10px;opacity:.7;text-transform:uppercase;letter-spacing:.5px}
  .col .value{font-size:18px;font-weight:800;margin-top:2px}
  .expires{font-size:11px;opacity:.85;margin-top:12px}
  .qr{margin-top:20px;background:#fff;width:100px;height:100px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#000;font-size:9px;text-align:center}
  .print{margin-top:20px;text-align:center;font-size:11px;color:#64748B}
</style>
</head>
<body>
<div class="pass">
  <div class="logo">${pass.logoText}</div>
  <div class="plan">${primary.value}</div>
  <div class="row">
    <div class="col">
      <div class="label">${wallet.label}</div>
      <div class="value">${wallet.value}</div>
    </div>
    <div class="col" style="text-align:right">
      <div class="label">${miles.label}</div>
      <div class="value">${miles.value}</div>
    </div>
  </div>
  ${expires ? `<div class="expires">Válido até ${expires.value}</div>` : ''}
  <div class="qr">QR: abra no app pra scan</div>
</div>
<p class="print">Imprima ou salve como PDF pra guardar seu cartão.</p>
</body>
</html>`;
  }
}
