CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'BEGINNER',
    "estimatedMin" INTEGER NOT NULL DEFAULT 10,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "premiumOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "quizzes_slug_key" ON "quizzes"("slug");
CREATE INDEX "quizzes_isPublished_level_idx" ON "quizzes"("isPublished", "level");

CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctId" TEXT NOT NULL,
    "explanation" TEXT,
    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "quiz_questions_quizId_orderIndex_key" ON "quiz_questions"("quizId", "orderIndex");

CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizSlug" TEXT NOT NULL,
    "quizTitle" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "holderName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "certificates_certNumber_key" ON "certificates"("certNumber");
CREATE INDEX "certificates_userId_idx" ON "certificates"("userId");

CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "certificateId" TEXT,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "quiz_attempts_certificateId_key" ON "quiz_attempts"("certificateId");
CREATE INDEX "quiz_attempts_userId_quizId_idx" ON "quiz_attempts"("userId", "quizId");

-- Seed quiz "Milhas 101"
INSERT INTO "quizzes" ("id", "slug", "title", "description", "level", "estimatedMin", "passingScore", "isPublished", "updatedAt") VALUES
  ('quiz-milhas-101', 'milhas-101', 'Milhas 101 — Fundamentos', 'Aprenda os conceitos básicos de milhas: CPM, bônus de transferência, award charts e resgate inteligente.', 'BEGINNER', 8, 70, true, CURRENT_TIMESTAMP);

INSERT INTO "quiz_questions" ("id", "quizId", "orderIndex", "question", "options", "correctId", "explanation") VALUES
  ('q1', 'quiz-milhas-101', 1, 'O que é CPM?',
    '[{"id":"a","text":"Custo por Milha"},{"id":"b","text":"Crédito Por Mês"},{"id":"c","text":"Conversão de Pontos Múltipla"},{"id":"d","text":"Compra Para Milhagem"}]',
    'a',
    'CPM = Custo Por Milha. R$ por 1.000 milhas. Menor CPM = compra/resgate mais vantajoso.'),
  ('q2', 'quiz-milhas-101', 2, 'Bônus de 100% em transferência significa que:',
    '[{"id":"a","text":"Ganha 100 milhas por real gasto"},{"id":"b","text":"Pontos dobram ao transferir pro programa destino"},{"id":"c","text":"100% das compras viram milhas"},{"id":"d","text":"Pontos valem R$100 cada"}]',
    'b',
    'Bônus 100% = 10.000 Livelo viram 20.000 Smiles. Multiplica o saldo, não o CPM.'),
  ('q3', 'quiz-milhas-101', 3, 'Em qual momento geralmente vale mais acumular pontos Livelo?',
    '[{"id":"a","text":"Quando o CPM do programa destino está alto"},{"id":"b","text":"Quando há bônus de transferência ativo"},{"id":"c","text":"Sempre, independente de bônus"},{"id":"d","text":"Nunca transfira sem bônus de 80%+"}]',
    'd',
    'Sem bônus, transferir perde valor — Livelo CPM ~R$20 vira Smiles CPM ~R$25. Espere bônus de 80%+ pra maximizar.'),
  ('q4', 'quiz-milhas-101', 4, 'Award chart é:',
    '[{"id":"a","text":"Gráfico de evolução de pontos"},{"id":"b","text":"Tabela fixa de milhas necessárias por rota"},{"id":"c","text":"Lista de cartões premium"},{"id":"d","text":"Calendário de bônus"}]',
    'b',
    'Award chart = quantas milhas resgatar voo X. Smiles/Latam/TudoAzul tem charts fixos por região.'),
  ('q5', 'quiz-milhas-101', 5, 'Classe executiva em milhas geralmente oferece:',
    '[{"id":"a","text":"Pior CPM que econômica"},{"id":"b","text":"CPM similar a econômica"},{"id":"c","text":"CPM 2-4x maior que econômica"},{"id":"d","text":"Não pode ser resgatada com milhas"}]',
    'c',
    'Executiva tem CPM 2-4x maior. Por isso viagens longas em business são o melhor uso de milhas.');
