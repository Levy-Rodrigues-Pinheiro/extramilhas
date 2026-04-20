-- Seed 2 canais Telegram públicos conhecidos pra milhas BR.
-- Source URL formato "telegram:<handle>" → TelegramAdapter resolve via t.me/s/.
-- Podem ser desativados/removidos pelo admin se baixa accuracy.

INSERT INTO "intel_sources" ("id", "name", "url", "sourceType", "minIntervalMin", "isActive", "updatedAt") VALUES
  ('intel-tg-pontosmais', 'Telegram — Pontos Mais (@pontosmais)', 'telegram:pontosmais', 'telegram', 180, true, CURRENT_TIMESTAMP),
  ('intel-tg-milheirosclube', 'Telegram — Milheiros Clube (@milheirosclube)', 'telegram:milheirosclube', 'telegram', 180, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
