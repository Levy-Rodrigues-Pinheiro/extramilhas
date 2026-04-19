import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureError } from '../lib/sentry';

interface Props {
  children: React.ReactNode;
  /** Fallback customizado — se não passado, usa o default bonito. */
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  error: Error | null;
}

/**
 * Pega qualquer erro não tratado na árvore de componentes.
 * Sem isso, um erro em QUALQUER tela = app branco sem saída.
 *
 * Com ele:
 *  1. Mostra tela de fallback com opção "tentar de novo"
 *  2. Reporta pro Sentry (se configurado)
 *  3. Em dev, mostra stack trace completo
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    captureError(error, { componentStack: info.componentStack });
    // Em dev, também imprime no console pra facilitar debug
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) {
      const Custom = this.props.fallback;
      return <Custom error={this.state.error} reset={this.reset} />;
    }

    return <DefaultFallback error={this.state.error} reset={this.reset} />;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="warning-outline" size={44} color="#F59E0B" />
      </View>
      <Text style={styles.title}>Algo deu errado</Text>
      <Text style={styles.subtitle}>
        Ocorreu um erro inesperado. O time já foi notificado e vai investigar.
      </Text>

      {__DEV__ && (
        <ScrollView style={styles.devBox} contentContainerStyle={styles.devContent}>
          <Text style={styles.devLabel}>DEV · stack:</Text>
          <Text style={styles.devText}>{error.message}</Text>
          {error.stack && (
            <Text style={styles.devStack} numberOfLines={20}>
              {error.stack}
            </Text>
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.button} onPress={reset} activeOpacity={0.8}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.buttonText}>Tentar de novo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0F172A',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: '#451A03',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: {
    color: '#94A3B8', fontSize: 14, textAlign: 'center',
    lineHeight: 20, marginBottom: 24,
  },
  devBox: {
    maxHeight: 240, width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 8, padding: 12,
    marginBottom: 24,
  },
  devContent: { paddingBottom: 8 },
  devLabel: { color: '#F59E0B', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  devText: { color: '#FCA5A5', fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  devStack: { color: '#CBD5E1', fontSize: 10, fontFamily: 'monospace', lineHeight: 14 },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
