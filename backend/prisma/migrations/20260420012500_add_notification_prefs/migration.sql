-- Preferências granulares de notificação
-- notifyBonus: master switch pro push de bônus aprovado
-- notifyProgramPairs: filtro JSON; vazio = todos, senão só os pares listados
-- notifyWhatsApp + whatsappVerifiedAt: canal WhatsApp PRO-only com opt-in verificado

ALTER TABLE "user_preferences" ADD COLUMN "notifyBonus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN "notifyProgramPairs" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "user_preferences" ADD COLUMN "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_preferences" ADD COLUMN "whatsappVerifiedAt" TIMESTAMP(3);
