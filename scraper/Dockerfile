FROM mcr.microsoft.com/playwright:v1.47.2-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/index.js"]
