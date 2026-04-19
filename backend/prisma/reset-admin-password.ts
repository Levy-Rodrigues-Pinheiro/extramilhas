/**
 * Reset admin password — SCRIPT DE EMERGÊNCIA.
 *
 * Uso:
 *   ADMIN_NEW_PASSWORD=SuaSenhaNovaForte ts-node prisma/reset-admin-password.ts
 *
 * Em prod (Fly):
 *   fly ssh console -a milhasextras-api
 *   ADMIN_NEW_PASSWORD=... node dist/prisma/reset-admin-password.js
 *
 * Imprime nova senha hashed e atualiza o usuário admin@milhasextras.com.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@milhasextras.com';
  let newPassword = process.env.ADMIN_NEW_PASSWORD;

  if (!newPassword) {
    // Gera senha forte se não foi passada
    newPassword = randomBytes(16).toString('base64url');
    console.log(`\n⚠️  ADMIN_NEW_PASSWORD não foi fornecida. Gerada automaticamente:`);
    console.log(`\n    ${newPassword}\n`);
    console.log('COPIE ESSA SENHA AGORA — não vai ser mostrada de novo.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.error(`❌ Usuário ${adminEmail} não encontrado.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: adminEmail },
    data: { passwordHash, refreshToken: null },
  });

  console.log(`\n✅ Senha do ${adminEmail} atualizada.`);
  console.log('Refresh tokens revogados — usuário precisa fazer login de novo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
