import React from 'react';
import { EmptyState } from '../components/EmptyState';

/**
 * Story do EmptyState — padrão de "sem dados" reusável.
 * Ativa com storybook runtime (ver .storybook/README).
 */
export default {
  title: 'Components/EmptyState',
  component: EmptyState,
  argTypes: {
    icon: { control: 'text' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
};

export const Default = {
  args: {
    icon: 'alert-circle-outline',
    title: 'Nada por aqui',
    description: 'Quando houver dados, eles aparecem nesse lugar.',
  },
};

export const Wallet = {
  args: {
    icon: 'wallet-outline',
    title: 'Carteira vazia',
    description: 'Adicione seu primeiro programa de milhas.',
  },
};

export const Error = {
  args: {
    icon: 'cloud-offline-outline',
    title: 'Sem conexão',
    description: 'Verifique sua internet e tente novamente.',
  },
};
