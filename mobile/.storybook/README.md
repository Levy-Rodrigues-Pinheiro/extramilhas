# Storybook (preview de componentes)

Organização pra desenvolver/testar componentes isolados sem depender de
navegação/auth do app.

## Status
Config prontinha, mas deps (@storybook/react-native + addons) ainda não
instaladas — evita bloat de bundle enquanto EAS quota está suspensa.

## Pra ativar (quando EAS reset 01/mai):
```bash
npm i -D @storybook/react-native @storybook/addon-ondevice-controls
npx sb init --type react_native
```

## Estrutura
```
.storybook/
  main.ts         # config bundler
  preview.tsx     # wrapper global (aplicar ThemeProvider)
src/stories/
  *.stories.tsx   # uma story por componente
```

## Stories já escritas (aguardando ativação)
- `AccessibleIconButton.stories.tsx`
- `EmptyState.stories.tsx`
- `ReviewCompact.stories.tsx`
- `LazyImage.stories.tsx`

Todas funcionam normal como módulos TypeScript — só faltam as runtime
deps de storybook pra renderizar.
