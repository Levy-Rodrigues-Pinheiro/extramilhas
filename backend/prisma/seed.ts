import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create loyalty programs
  const programs = await Promise.all([
    prisma.loyaltyProgram.upsert({
      where: { slug: 'smiles' },
      update: {},
      create: {
        name: 'Smiles',
        slug: 'smiles',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/smiles.png',
        websiteUrl: 'https://www.smiles.com.br',
        avgCpmCurrent: 28.5,
        isActive: true,
      },
    }),
    prisma.loyaltyProgram.upsert({
      where: { slug: 'livelo' },
      update: {},
      create: {
        name: 'Livelo',
        slug: 'livelo',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/livelo.png',
        websiteUrl: 'https://www.livelo.com.br',
        avgCpmCurrent: 32.0,
        isActive: true,
      },
    }),
    prisma.loyaltyProgram.upsert({
      where: { slug: 'tudoazul' },
      update: {},
      create: {
        name: 'TudoAzul',
        slug: 'tudoazul',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/tudoazul.png',
        websiteUrl: 'https://www.tudoazul.com.br',
        avgCpmCurrent: 22.0,
        isActive: true,
      },
    }),
    prisma.loyaltyProgram.upsert({
      where: { slug: 'latampass' },
      update: {},
      create: {
        name: 'Latam Pass',
        slug: 'latampass',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/latampass.png',
        websiteUrl: 'https://www.latamairlines.com/br/pt/latam-pass',
        avgCpmCurrent: 24.5,
        isActive: true,
      },
    }),
    prisma.loyaltyProgram.upsert({
      where: { slug: 'esfera' },
      update: {},
      create: {
        name: 'Esfera',
        slug: 'esfera',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/esfera.png',
        websiteUrl: 'https://www.esfera.com.vc',
        avgCpmCurrent: 18.5,
        isActive: true,
      },
    }),
    prisma.loyaltyProgram.upsert({
      where: { slug: 'multiplus' },
      update: {},
      create: {
        name: 'Multiplus',
        slug: 'multiplus',
        logoUrl: 'https://cdn.milhasextras.com.br/logos/multiplus.png',
        websiteUrl: 'https://www.multiplus.com.br',
        avgCpmCurrent: 35.0,
        isActive: false, // Multiplus was merged into LATAM Pass in 2020
      },
    }),
  ]);

  console.log(`Created ${programs.length} loyalty programs`);

  const [smiles, livelo, tudoazul, latampass, esfera, multiplus] = programs;

  // Create sample offers
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const offers = await Promise.all([
    prisma.offer.create({
      data: {
        programId: smiles.id,
        type: 'PURCHASE',
        title: 'Smiles com 100% de bônus - Compre milhas com preço histórico',
        description: 'Aproveite a promoção imperdível da Smiles com 100% de bônus na compra de milhas. CPM de apenas R$ 18,50 por 1.000 milhas.',
        cpm: 18.5,
        classification: 'IMPERDIVEL',
        sourceUrl: 'https://www.smiles.com.br/compre-milhas',
        affiliateUrl: 'https://go.milhasextras.com.br/smiles-100-bonus',
        startsAt: now,
        expiresAt: oneWeekLater,
        isActive: true,
        metadata: JSON.stringify({ bonusPercentage: 100, minMiles: 1000, maxMiles: 100000, paymentMethods: ['credit_card', 'debit_card'] }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: livelo.id,
        type: 'TRANSFER_BONUS',
        title: 'Livelo 80% de bônus na transferência para Smiles',
        description: 'Transfira seus pontos Livelo para Smiles com 80% de bônus. Transforme 10.000 pontos em 18.000 milhas Smiles.',
        cpm: 24.0,
        classification: 'BOA',
        sourceUrl: 'https://www.livelo.com.br/transferir-pontos',
        affiliateUrl: 'https://go.milhasextras.com.br/livelo-80-smiles',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ bonusPercentage: 80, fromProgram: 'Livelo', toProgram: 'Smiles', minPoints: 10000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: tudoazul.id,
        type: 'PURCHASE',
        title: 'TudoAzul - Pontos a partir de R$ 19,00 por 1.000',
        description: 'Compre pontos TudoAzul com ótimo custo-benefício. Ideal para resgates de passagens na Azul.',
        cpm: 19.0,
        classification: 'IMPERDIVEL',
        sourceUrl: 'https://www.tudoazul.com.br/compre-pontos',
        affiliateUrl: 'https://go.milhasextras.com.br/tudoazul-compra',
        startsAt: now,
        expiresAt: oneWeekLater,
        isActive: true,
        metadata: JSON.stringify({ bonusPercentage: 0, minPoints: 5000, maxPoints: 200000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: latampass.id,
        type: 'AWARD_DISCOUNT',
        title: 'Latam Pass - 30% de desconto em resgates nacionais',
        description: 'Resgate passagens nacionais com 30% de desconto em milhas na Latam Pass. Válido para voos entre capitais.',
        cpm: 22.0,
        classification: 'BOA',
        sourceUrl: 'https://www.latamairlines.com/br/pt/latam-pass',
        affiliateUrl: 'https://go.milhasextras.com.br/latam-30-off',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ discountPercentage: 30, routes: ['GRU-CGH', 'GRU-REC', 'GRU-SSA', 'GRU-FOR'], cabinClass: 'economy' }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: esfera.id,
        type: 'PROMO',
        title: 'Esfera - Ganhe até 15 pontos por real em compras selecionadas',
        description: 'Parceiros Esfera com mega aceleração de pontos. Compre em lojas parceiras e acumule até 15x mais.',
        cpm: 16.0,
        classification: 'IMPERDIVEL',
        sourceUrl: 'https://www.esfera.com.vc/promocoes',
        affiliateUrl: 'https://go.milhasextras.com.br/esfera-15x',
        startsAt: now,
        expiresAt: oneWeekLater,
        isActive: true,
        metadata: JSON.stringify({ multiplier: 15, partners: ['Magazine Luiza', 'Americanas', 'Casas Bahia'], category: 'eletronicos' }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: multiplus.id,
        type: 'PURCHASE',
        title: 'Multiplus - Compre milhas com 120% de bônus',
        description: 'Oportunidade rara! Compre milhas Multiplus com 120% de bônus. CPM de R$ 20 por 1.000 milhas.',
        cpm: 20.0,
        classification: 'IMPERDIVEL',
        sourceUrl: 'https://www.multiplus.com.br/compre-milhas',
        affiliateUrl: 'https://go.milhasextras.com.br/multiplus-120',
        startsAt: now,
        expiresAt: oneWeekLater,
        isActive: false, // Multiplus is defunct — kept only for historical reference
        metadata: JSON.stringify({ bonusPercentage: 120, minMiles: 2000, maxMiles: 150000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: smiles.id,
        type: 'TRANSFER_BONUS',
        title: 'Smiles aceita transferência do Banco Inter com 60% de bônus',
        description: 'Transfira pontos do Banco Inter para Smiles com 60% de bônus. Mínimo de 5.000 pontos.',
        cpm: 26.0,
        classification: 'BOA',
        sourceUrl: 'https://www.smiles.com.br/transferir',
        affiliateUrl: 'https://go.milhasextras.com.br/smiles-inter-60',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ bonusPercentage: 60, fromProgram: 'Banco Inter', toProgram: 'Smiles', minPoints: 5000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: livelo.id,
        type: 'PROMO',
        title: 'Livelo - Pontos com validade estendida por 12 meses',
        description: 'Estenda a validade dos seus pontos Livelo por mais 12 meses com essa promoção exclusiva.',
        cpm: 30.0,
        classification: 'NORMAL',
        sourceUrl: 'https://www.livelo.com.br/extender-validade',
        affiliateUrl: 'https://go.milhasextras.com.br/livelo-validade',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ extensionMonths: 12, minPoints: 1000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: latampass.id,
        type: 'PURCHASE',
        title: 'Latam Pass - Compre milhas parcelado em até 12x sem juros',
        description: 'Compre milhas Latam Pass parcelado em até 12x sem juros no cartão de crédito.',
        cpm: 23.5,
        classification: 'BOA',
        sourceUrl: 'https://www.latamairlines.com/br/pt/compre-milhas',
        affiliateUrl: 'https://go.milhasextras.com.br/latam-12x',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ installments: 12, minMiles: 5000, maxMiles: 100000 }),
      },
    }),
    prisma.offer.create({
      data: {
        programId: tudoazul.id,
        type: 'AWARD_DISCOUNT',
        title: 'TudoAzul - Voos internacionais com 20% de desconto em pontos',
        description: 'Resgate voos internacionais na Azul com 20% de desconto em pontos TudoAzul. Válido para voos para EUA e Europa.',
        cpm: 21.0,
        classification: 'BOA',
        sourceUrl: 'https://www.tudoazul.com.br/voos-internacionais',
        affiliateUrl: 'https://go.milhasextras.com.br/tudoazul-intl',
        startsAt: now,
        expiresAt: twoWeeksLater,
        isActive: true,
        metadata: JSON.stringify({ discountPercentage: 20, destinations: ['MCO', 'JFK', 'MIA', 'LIS', 'FCO'], cabinClass: 'economy' }),
      },
    }),
  ]);

  console.log(`Created ${offers.length} offers`);

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@milhasextras.com' },
    update: {},
    create: {
      email: 'admin@milhasextras.com',
      name: 'Admin Milhas Extras',
      passwordHash: adminPasswordHash,
      isAdmin: true,
      subscriptionPlan: 'PRO',
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create a test regular user
  const userPasswordHash = await bcrypt.hash('User@123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'user@milhasextras.com' },
    update: {},
    create: {
      email: 'user@milhasextras.com',
      name: 'Usuário Teste',
      passwordHash: userPasswordHash,
      isAdmin: false,
      subscriptionPlan: 'FREE',
    },
  });

  console.log(`Created test user: ${testUser.email}`);

  // Create price history for last 30 days
  const priceHistoryData = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const program of programs) {
      const baseAvg = Number(program.avgCpmCurrent);
      const variation = (Math.random() - 0.5) * 4;
      const avgCpm = Math.max(15, baseAvg + variation);
      const minCpm = avgCpm * 0.85;

      priceHistoryData.push({
        programId: program.id,
        date,
        avgCpm: parseFloat(avgCpm.toFixed(2)),
        minCpm: parseFloat(minCpm.toFixed(2)),
        source: 'scraper',
      });
    }
  }

  await prisma.priceHistory.createMany({
    data: priceHistoryData,
  });

  console.log(`Created ${priceHistoryData.length} price history records`);

  // Create sample articles
  await prisma.contentArticle.createMany({
    data: [
      {
        title: 'Como calcular o CPM e identificar as melhores ofertas de milhas',
        slug: 'como-calcular-cpm-melhores-ofertas',
        body: '## O que é CPM?\n\nO **CPM (Custo por Mil milhas)** é a métrica mais importante para avaliar ofertas de milhas aéreas. Ele indica quanto você paga por cada 1.000 milhas adquiridas.\n\n## Como calcular\n\nA fórmula é simples:\n\n**CPM = Valor pago / (Quantidade de milhas / 1.000)**\n\nPor exemplo, se você paga R$200 por 10.000 milhas:\n- CPM = 200 / (10.000 / 1.000) = R$20,00\n\n## Classificação de ofertas\n\n- **Imperdível**: CPM abaixo de R$20\n- **Boa**: CPM entre R$20 e R$30\n- **Normal**: CPM acima de R$30\n\n## Dicas para encontrar boas ofertas\n\n- Fique atento às promoções sazonais\n- Compare sempre o CPM entre programas\n- Use alertas automáticos para não perder oportunidades\n- Considere transferências com bônus entre programas',
        category: 'Guias',
        isProOnly: false,
        publishedAt: new Date(),
      },
      {
        title: 'Guia completo: Transferências entre programas de fidelidade em 2024',
        slug: 'guia-transferencias-programas-fidelidade-2024',
        body: '## Transferências entre programas\n\nEntender as regras de transferência entre programas de milhas pode parecer complexo, mas com as informações certas você consegue **maximizar o valor dos seus pontos**.\n\n## Principais parcerias\n\n- Livelo → Smiles, TudoAzul, Latam Pass\n- Esfera → Smiles, TudoAzul\n- Banco do Brasil → Livelo\n- Itaú → Livelo, Esfera\n\n## Quando transferir\n\n- Aproveite promoções de bônus (podem chegar a 100%+)\n- Compare o CPM final após a transferência\n- Considere a validade dos pontos no programa destino\n\n## Cuidados importantes\n\n- Transferências geralmente são irreversíveis\n- Verifique prazos de creditação\n- Atenção à validade dos pontos após transferência',
        category: 'Guias',
        isProOnly: false,
        publishedAt: new Date(),
      },
      {
        title: 'Análise exclusiva: Melhores programas para acúmulo de milhas no Brasil',
        slug: 'analise-exclusiva-melhores-programas-acumulo',
        body: '## Análise comparativa dos programas\n\nAnálise detalhada e comparativa dos principais programas de fidelidade brasileiros.\n\n### Smiles (GOL)\n\n- **Melhor para**: Voos domésticos e parceiros internacionais\n- **CPM médio**: R$28,50\n- **Destaque**: Frequentes promoções de compra com bônus\n\n### TudoAzul (Azul)\n\n- **Melhor para**: Destinos exclusivos no Brasil\n- **CPM médio**: R$22,00\n- **Destaque**: Melhor custo-benefício em compra direta\n\n### Latam Pass\n\n- **Melhor para**: Voos internacionais e oneworld\n- **CPM médio**: R$24,50\n- **Destaque**: Rede de parceiros internacionais\n\n### Livelo\n\n- **Melhor para**: Flexibilidade de transferência\n- **CPM médio**: R$32,00\n- **Destaque**: Maior variedade de parceiros de transferência\n\n### Esfera\n\n- **Melhor para**: Acúmulo no dia a dia\n- **CPM médio**: R$18,50\n- **Destaque**: Melhor CPM em promoções de aceleração',
        category: 'Dicas',
        isProOnly: true,
        publishedAt: new Date(),
      },
    ],
  });

  console.log('Created sample articles');

  // Create transfer partnerships
  const partnerships = [
    { from: 'livelo', to: 'smiles', baseRate: 1.0, bonus: 80 },
    { from: 'livelo', to: 'tudoazul', baseRate: 1.0, bonus: 60 },
    { from: 'livelo', to: 'latampass', baseRate: 1.0, bonus: 0 },
    { from: 'esfera', to: 'smiles', baseRate: 1.0, bonus: 50 },
    { from: 'esfera', to: 'tudoazul', baseRate: 1.0, bonus: 40 },
  ];
  for (const p of partnerships) {
    const fromProg = programs.find(pr => pr.slug === p.from);
    const toProg = programs.find(pr => pr.slug === p.to);
    if (fromProg && toProg) {
      await prisma.transferPartnership.create({
        data: { fromProgramId: fromProg.id, toProgramId: toProg.id, baseRate: p.baseRate, currentBonus: p.bonus, isActive: true, expiresAt: new Date(Date.now() + 30*24*60*60*1000) },
      });
    }
  }
  console.log('Created transfer partnerships');

  // ─── Award Charts ────────────────────────────────────────────────────────────

  const COORDS: Record<string, { lat: number; lng: number }> = {
    EZE: { lat: -34.82, lng: -58.54 },
    MVD: { lat: -34.84, lng: -56.03 },
    SCL: { lat: -33.39, lng: -70.79 },
    LIM: { lat: -12.02, lng: -77.11 },
    BOG: { lat: 4.70, lng: -74.15 },
    CUN: { lat: 21.04, lng: -86.87 },
    MIA: { lat: 25.80, lng: -80.29 },
    MCO: { lat: 28.43, lng: -81.31 },
    JFK: { lat: 40.64, lng: -73.78 },
    LAX: { lat: 33.94, lng: -118.41 },
    FLL: { lat: 26.07, lng: -80.15 },
    LIS: { lat: 38.77, lng: -9.13 },
    MAD: { lat: 40.47, lng: -3.56 },
    CDG: { lat: 49.01, lng: 2.55 },
    LHR: { lat: 51.47, lng: -0.46 },
    FCO: { lat: 41.80, lng: 12.25 },
    DXB: { lat: 25.25, lng: 55.36 },
    NRT: { lat: 35.76, lng: 140.39 },
    SYD: { lat: -33.95, lng: 151.18 },
  };

  // Smiles (GOL) — Award Chart from GRU
  // Valores atualizados com base em dados reais de 2025/2026
  // Fontes: passageirodeprimeira.com, pontospravoar.com, smiles.com.br
  const smilesChart = [
    { dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 20000, business: 50000, direct: true },
    { dest: 'MVD', name: 'Montevideo', country: 'Uruguai', economy: 20000, business: 50000, direct: true },
    { dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 30000, business: 70000, direct: true },
    { dest: 'LIM', name: 'Lima', country: 'Peru', economy: 35000, business: 80000, direct: true },
    { dest: 'BOG', name: 'Bogotá', country: 'Colômbia', economy: 35000, business: 80000, direct: true },
    { dest: 'CUN', name: 'Cancún', country: 'México', economy: 50000, business: 100000, direct: false },
    { dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: true },
    { dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 55000, business: 120000, direct: false },
    { dest: 'JFK', name: 'Nova York', country: 'EUA', economy: 65000, business: 140000, direct: true },
    { dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 85000, business: 170000, direct: true },
    { dest: 'MAD', name: 'Madri', country: 'Espanha', economy: 90000, business: 180000, direct: true },
    { dest: 'CDG', name: 'Paris', country: 'França', economy: 95000, business: 190000, direct: true },
    { dest: 'LHR', name: 'Londres', country: 'Reino Unido', economy: 95000, business: 190000, direct: true },
    { dest: 'FCO', name: 'Roma', country: 'Itália', economy: 95000, business: 190000, direct: false },
    { dest: 'DXB', name: 'Dubai', country: 'Emirados Árabes', economy: 120000, business: 250000, direct: false },
    { dest: 'NRT', name: 'Tóquio', country: 'Japão', economy: 140000, business: 280000, direct: false },
  ];

  for (const entry of smilesChart) {
    const coords = COORDS[entry.dest];
    for (const cabin of ['economy', 'business'] as const) {
      await prisma.awardChart.upsert({
        where: {
          programId_origin_destination_cabinClass: {
            programId: smiles.id,
            origin: 'GRU',
            destination: entry.dest,
            cabinClass: cabin,
          },
        },
        update: {
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          destinationName: entry.name,
          country: entry.country,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
        },
        create: {
          programId: smiles.id,
          origin: 'GRU',
          destination: entry.dest,
          destinationName: entry.name,
          country: entry.country,
          cabinClass: cabin,
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
          source: 'manual',
        },
      });
    }
  }

  console.log(`Created ${smilesChart.length * 2} Smiles award chart entries`);

  // TudoAzul (Azul Fidelidade) — Award Chart from GRU
  // Valores atualizados com base em dados reais de 2025/2026
  // Fontes: pontospravoar.com, tudoazul.com.br, passageirodeprimeira.com
  const tudoazulChart = [
    { dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 18000, business: 35000, direct: true },
    { dest: 'MVD', name: 'Montevideo', country: 'Uruguai', economy: 18000, business: 35000, direct: true },
    { dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 25000, business: 55000, direct: false },
    { dest: 'LIM', name: 'Lima', country: 'Peru', economy: 30000, business: 65000, direct: false },
    { dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 70000, business: 150000, direct: true },
    { dest: 'FLL', name: 'Fort Lauderdale', country: 'EUA', economy: 70000, business: 150000, direct: true },
    { dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: true },
    { dest: 'CDG', name: 'Paris', country: 'França', economy: 90000, business: 180000, direct: false },
  ];

  for (const entry of tudoazulChart) {
    const coords = COORDS[entry.dest];
    for (const cabin of ['economy', 'business'] as const) {
      await prisma.awardChart.upsert({
        where: {
          programId_origin_destination_cabinClass: {
            programId: tudoazul.id,
            origin: 'GRU',
            destination: entry.dest,
            cabinClass: cabin,
          },
        },
        update: {
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          destinationName: entry.name,
          country: entry.country,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
        },
        create: {
          programId: tudoazul.id,
          origin: 'GRU',
          destination: entry.dest,
          destinationName: entry.name,
          country: entry.country,
          cabinClass: cabin,
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
          source: 'manual',
        },
      });
    }
  }

  console.log(`Created ${tudoazulChart.length * 2} TudoAzul award chart entries`);

  // Latam Pass — Award Chart from GRU
  // Valores atualizados com base em dados reais de 2025/2026
  // Fontes: latampass.latam.com, passageirodeprimeira.com, estevampelomundo.com.br
  // LATAM usa preços dinâmicos — estes são valores típicos/médios
  const latampassChart = [
    { dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: true },
    { dest: 'MVD', name: 'Montevideo', country: 'Uruguai', economy: 15000, business: 40000, direct: true },
    { dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 20000, business: 55000, direct: true },
    { dest: 'LIM', name: 'Lima', country: 'Peru', economy: 25000, business: 65000, direct: true },
    { dest: 'BOG', name: 'Bogotá', country: 'Colômbia', economy: 25000, business: 65000, direct: true },
    { dest: 'CUN', name: 'Cancún', country: 'México', economy: 40000, business: 100000, direct: false },
    { dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: true },
    { dest: 'JFK', name: 'Nova York', country: 'EUA', economy: 60000, business: 160000, direct: true },
    { dest: 'LAX', name: 'Los Angeles', country: 'EUA', economy: 60000, business: 160000, direct: false },
    { dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 70000, business: 180000, direct: false },
    { dest: 'MAD', name: 'Madri', country: 'Espanha', economy: 75000, business: 190000, direct: true },
    { dest: 'CDG', name: 'Paris', country: 'França', economy: 80000, business: 200000, direct: true },
    { dest: 'LHR', name: 'Londres', country: 'Reino Unido', economy: 80000, business: 200000, direct: false },
    { dest: 'FCO', name: 'Roma', country: 'Itália', economy: 80000, business: 200000, direct: false },
    { dest: 'SYD', name: 'Sydney', country: 'Austrália', economy: 120000, business: 300000, direct: false },
    { dest: 'NRT', name: 'Tóquio', country: 'Japão', economy: 110000, business: 280000, direct: false },
  ];

  for (const entry of latampassChart) {
    const coords = COORDS[entry.dest];
    for (const cabin of ['economy', 'business'] as const) {
      await prisma.awardChart.upsert({
        where: {
          programId_origin_destination_cabinClass: {
            programId: latampass.id,
            origin: 'GRU',
            destination: entry.dest,
            cabinClass: cabin,
          },
        },
        update: {
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          destinationName: entry.name,
          country: entry.country,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
        },
        create: {
          programId: latampass.id,
          origin: 'GRU',
          destination: entry.dest,
          destinationName: entry.name,
          country: entry.country,
          cabinClass: cabin,
          milesRequired: cabin === 'economy' ? entry.economy : entry.business,
          isDirectFlight: entry.direct,
          lat: coords?.lat,
          lng: coords?.lng,
          source: 'manual',
        },
      });
    }
  }

  console.log(`Created ${latampassChart.length * 2} Latam Pass award chart entries`);

  // ─── Rotas de OUTROS aeroportos brasileiros ───────────────────────────────
  // Dados reais: GOL/Smiles opera de GIG, LATAM de GIG/BSB, Azul de VCP/REC/FOR
  // Fontes: sites das companhias, 2025/2026

  const otherOriginRoutes = [
    // GIG (Rio de Janeiro Galeão) — LATAM e GOL operam internacionais
    { origin: 'GIG', program: smiles, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 20000, business: 50000, direct: true },
    { origin: 'GIG', program: smiles, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: true },
    { origin: 'GIG', program: smiles, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 85000, business: 170000, direct: false },
    { origin: 'GIG', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: true },
    { origin: 'GIG', program: latampass, dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 20000, business: 55000, direct: true },
    { origin: 'GIG', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: true },
    { origin: 'GIG', program: latampass, dest: 'MAD', name: 'Madri', country: 'Espanha', economy: 75000, business: 190000, direct: false },
    { origin: 'GIG', program: latampass, dest: 'CDG', name: 'Paris', country: 'França', economy: 80000, business: 200000, direct: false },

    // VCP (Campinas Viracopos) — Azul opera internacionais
    { origin: 'VCP', program: tudoazul, dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 70000, business: 150000, direct: true },
    { origin: 'VCP', program: tudoazul, dest: 'FLL', name: 'Fort Lauderdale', country: 'EUA', economy: 70000, business: 150000, direct: true },
    { origin: 'VCP', program: tudoazul, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: true },
    { origin: 'VCP', program: tudoazul, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 18000, business: 35000, direct: true },

    // BSB (Brasília) — LATAM opera regionais e alguns intl
    { origin: 'BSB', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: false },
    { origin: 'BSB', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },
    { origin: 'BSB', program: latampass, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 70000, business: 180000, direct: false },
    { origin: 'BSB', program: smiles, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 20000, business: 50000, direct: false },
    { origin: 'BSB', program: smiles, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: false },

    // REC (Recife) — Azul e LATAM operam intl
    { origin: 'REC', program: tudoazul, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: true },
    { origin: 'REC', program: tudoazul, dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 70000, business: 150000, direct: false },
    { origin: 'REC', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },
    { origin: 'REC', program: latampass, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 70000, business: 180000, direct: false },

    // FOR (Fortaleza) — Azul e GOL operam intl
    { origin: 'FOR', program: tudoazul, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: true },
    { origin: 'FOR', program: tudoazul, dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 70000, business: 150000, direct: false },
    { origin: 'FOR', program: smiles, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: false },

    // SSA (Salvador) — LATAM opera regionais
    { origin: 'SSA', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: false },
    { origin: 'SSA', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },

    // POA (Porto Alegre) — LATAM opera regionais sul-americanos
    { origin: 'POA', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: true },
    { origin: 'POA', program: latampass, dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 20000, business: 55000, direct: false },
    { origin: 'POA', program: latampass, dest: 'MVD', name: 'Montevideo', country: 'Uruguai', economy: 15000, business: 40000, direct: true },

    // CNF (Belo Horizonte Confins) — Azul opera intl
    { origin: 'CNF', program: tudoazul, dest: 'MCO', name: 'Orlando', country: 'EUA', economy: 70000, business: 150000, direct: true },
    { origin: 'CNF', program: tudoazul, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: false },
    { origin: 'CNF', program: tudoazul, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 18000, business: 35000, direct: false },
    { origin: 'CNF', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: false },

    // CWB (Curitiba) — LATAM e Azul
    { origin: 'CWB', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: true },
    { origin: 'CWB', program: latampass, dest: 'SCL', name: 'Santiago', country: 'Chile', economy: 20000, business: 55000, direct: false },
    { origin: 'CWB', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },
    { origin: 'CWB', program: tudoazul, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 18000, business: 35000, direct: false },

    // FLN (Florianópolis) — LATAM e Azul
    { origin: 'FLN', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: true },
    { origin: 'FLN', program: latampass, dest: 'MVD', name: 'Montevideo', country: 'Uruguai', economy: 15000, business: 40000, direct: false },
    { origin: 'FLN', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },
    { origin: 'FLN', program: tudoazul, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 18000, business: 35000, direct: false },

    // NAT (Natal) — Azul opera para Lisboa
    { origin: 'NAT', program: tudoazul, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 80000, business: 160000, direct: true },
    { origin: 'NAT', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },

    // BEL (Belém) — GOL opera regionais e intl
    { origin: 'BEL', program: smiles, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: false },
    { origin: 'BEL', program: smiles, dest: 'LIS', name: 'Lisboa', country: 'Portugal', economy: 85000, business: 170000, direct: false },
    { origin: 'BEL', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },

    // MAO (Manaus) — GOL opera intl para MIA
    { origin: 'MAO', program: smiles, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 55000, business: 120000, direct: true },
    { origin: 'MAO', program: latampass, dest: 'MIA', name: 'Miami', country: 'EUA', economy: 50000, business: 130000, direct: false },
    { origin: 'MAO', program: latampass, dest: 'EZE', name: 'Buenos Aires', country: 'Argentina', economy: 15000, business: 40000, direct: false },

    // CGH (Congonhas) — Apenas doméstico, sem intl direto. Conexão por GRU
    // SDU (Santos Dumont) — Apenas doméstico, sem intl direto. Conexão por GIG
    // Estes aeroportos NÃO terão rotas internacionais pois na realidade não operam intl
  ];

  let otherCount = 0;
  for (const route of otherOriginRoutes) {
    const coords = COORDS[route.dest];
    for (const cabin of ['economy', 'business'] as const) {
      await prisma.awardChart.upsert({
        where: {
          programId_origin_destination_cabinClass: {
            programId: route.program.id,
            origin: route.origin,
            destination: route.dest,
            cabinClass: cabin,
          },
        },
        update: {
          milesRequired: cabin === 'economy' ? route.economy : route.business,
        },
        create: {
          programId: route.program.id,
          origin: route.origin,
          destination: route.dest,
          destinationName: route.name,
          country: route.country,
          cabinClass: cabin,
          milesRequired: cabin === 'economy' ? route.economy : route.business,
          isDirectFlight: route.direct,
          lat: coords?.lat,
          lng: coords?.lng,
          source: 'manual',
        },
      });
      otherCount++;
    }
  }
  console.log(`Created ${otherCount} other-origin award chart entries`);

  // Create expiring balances for test user
  await prisma.userMilesBalance.upsert({
    where: { userId_programId: { userId: testUser.id, programId: smiles.id } },
    update: { balance: 15000, expiresAt: new Date(Date.now() + 5*24*60*60*1000) },
    create: { userId: testUser.id, programId: smiles.id, balance: 15000, expiresAt: new Date(Date.now() + 5*24*60*60*1000) },
  });
  console.log('Created expiring balances');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
