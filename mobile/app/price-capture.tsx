import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CAPTURE_SCRIPT, parseOfficialUrl } from '../src/lib/webview-interceptor';
import api from '../src/lib/api';

/**
 * Tela que abre o site oficial da companhia em WebView e captura, em tempo real,
 * as respostas da API de voos que o próprio site consulta.
 *
 * Essa é a implementação do modelo "crowdsourcing" do nosso plano grátis:
 * o IP e cookies SÃO DO USUÁRIO, então Akamai aceita como tráfego legítimo.
 * Nenhum PII é coletado — só preço/milhas/voo, que o usuário já vê na tela.
 *
 * Ativação: usuário precisa ter optado (settings > "Contribuir com a comunidade").
 * Em dev, o opt-in default é true pra facilitar testes.
 */

const WEBHOOK_PATH = '/webhooks/scraper-result';
const WEBHOOK_SECRET = 'crowdsourced-v1'; // source marker, não o secret do Actions

interface CapturedMessage {
  type: 'flight-capture' | 'injection-ready';
  kind?: 'fetch' | 'xhr';
  url?: string;
  href?: string;
  flights?: Array<{
    milesRequired: number;
    taxBrl: number;
    airline: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    stops: number;
    duration: string;
  }>;
  capturedAt?: string;
}

export default function PriceCaptureScreen() {
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const url = params.url ? decodeURIComponent(params.url) : '';
  const title = params.title || 'Site da companhia';

  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [captured, setCaptured] = useState(0);
  const [ready, setReady] = useState(false);
  const contextRef = useRef(parseOfficialUrl(url));

  const handleMessage = useCallback(async (e: WebViewMessageEvent) => {
    let msg: CapturedMessage;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }

    if (msg.type === 'injection-ready') {
      setReady(true);
      return;
    }

    if (msg.type !== 'flight-capture' || !msg.flights || !msg.flights.length) return;

    const ctx = contextRef.current;
    if (!ctx || !ctx.origin || !ctx.destination) return;

    // Monta payload no shape que o backend webhook espera
    const payload = {
      source: 'crowdsourced-mobile',
      results: msg.flights.map((f) => ({
        programSlug: ctx.programSlug,
        programName:
          ctx.programSlug === 'smiles' ? 'Smiles (GOL)' :
          ctx.programSlug === 'tudoazul' ? 'TudoAzul (Azul)' : 'LATAM Pass',
        origin: ctx.origin,
        destination: ctx.destination,
        date: ctx.date,
        cabinClass: ctx.cabinClass || 'economy',
        milesRequired: f.milesRequired,
        taxBrl: f.taxBrl || 0,
        airline: f.airline || '',
        flightNumber: f.flightNumber || '',
        departureTime: f.departureTime || '',
        arrivalTime: f.arrivalTime || '',
        stops: f.stops ?? 0,
        duration: f.duration || '',
        source: 'live_scraping',
        scrapedAt: msg.capturedAt || new Date().toISOString(),
      })),
      meta: {
        capturedVia: msg.kind,
        capturedUrl: msg.url?.substring(0, 200),
        platform: Platform.OS,
      },
    };

    try {
      // Usa o `api` do app que já tem baseURL correto por plataforma.
      // O backend aceita sem secret quando source começa com "crowdsourced-"
      // (permissão mais frouxa pra dados user-contributed — seguro porque
      // passamos por sanity checks no controller).
      await api.post(WEBHOOK_PATH, payload, {
        headers: { 'X-Scraper-Secret': WEBHOOK_SECRET },
      });
      setCaptured((c) => c + (payload.results.length || 0));
    } catch (err: any) {
      // Silencioso — não queremos popup ao usuário por erro técnico
      if (__DEV__) console.warn('[capture] webhook failed:', err?.message);
    }
  }, []);

  const handleNavChange = useCallback((nav: WebViewNavigation) => {
    if (!nav.loading) setLoading(false);
    // Atualiza contexto se URL mudar (ex: site redirecionou)
    const newCtx = parseOfficialUrl(nav.url);
    if (newCtx) contextRef.current = newCtx;
  }, []);

  if (!url) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>URL não fornecida</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          {captured > 0 ? (
            <Text style={styles.subtitle}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" /> {captured} resultado{captured > 1 ? 's' : ''} contribuído{captured > 1 ? 's' : ''}
            </Text>
          ) : (
            <Text style={styles.subtitle}>
              {ready ? 'Aguardando o site carregar os preços...' : 'Carregando site oficial...'}
            </Text>
          )}
        </View>
      </View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.web}
        injectedJavaScriptBeforeContentLoaded={CAPTURE_SCRIPT}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavChange}
        onLoadEnd={() => setLoading(false)}
        userAgent={Platform.OS === 'ios' ? undefined : 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        cacheEnabled
      />

      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
        <Text style={styles.footerText}>
          Seus dados de login não são acessados. Apenas preços visíveis na tela são capturados.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
    backgroundColor: '#1E293B',
  },
  backBtn: { padding: 6, marginRight: 8 },
  titleBox: { flex: 1 },
  title: { color: '#fff', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  web: { flex: 1, backgroundColor: '#fff' },
  loaderOverlay: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 10,
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, backgroundColor: '#1E293B',
    borderTopWidth: 1, borderTopColor: '#334155',
  },
  footerText: { color: '#94A3B8', fontSize: 10, flex: 1 },
  error: { color: '#EF4444', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
