/**
 * Storybook preview wrapper — aplica ThemeProvider a todas stories.
 * Ativa quando storybook instalado via npm i @storybook/react-native.
 */
import React from 'react';
import { View } from 'react-native';
import { ThemeProvider } from '../src/lib/ThemeProvider';

export const decorators = [
  (Story: React.ComponentType) => (
    <ThemeProvider>
      <View style={{ flex: 1, padding: 16, backgroundColor: '#0B1120' }}>
        <Story />
      </View>
    </ThemeProvider>
  ),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
