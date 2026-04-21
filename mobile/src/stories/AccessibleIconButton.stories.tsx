import React from 'react';
import { Alert } from 'react-native';
import { AccessibleIconButton } from '../components/AccessibleIconButton';

export default {
  title: 'Components/AccessibleIconButton',
  component: AccessibleIconButton,
  argTypes: {
    icon: { control: 'text' },
    label: { control: 'text' },
    size: { control: { type: 'range', min: 14, max: 40, step: 2 } },
    color: { control: 'color' },
    bg: { control: 'color' },
  },
};

export const Default = {
  args: {
    icon: 'notifications',
    label: 'Abrir notificações',
    onPress: () => Alert.alert('Clicou!'),
  },
};

export const Large = {
  args: {
    icon: 'heart',
    label: 'Favoritar',
    size: 32,
    color: '#EF4444',
  },
};

export const WithBackground = {
  args: {
    icon: 'add',
    label: 'Criar item',
    bg: '#3B82F6',
    color: '#fff',
  },
};
