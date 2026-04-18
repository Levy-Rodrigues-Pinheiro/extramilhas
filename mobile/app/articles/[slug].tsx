import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useArticle } from '../../src/hooks/useArticles';
import { EmptyState } from '../../src/components/EmptyState';
import { Colors } from '../../src/lib/theme';

const CATEGORY_COLORS: Record<string, string> = {
  Guias: '#3B82F6',
  Dicas: '#22c55e',
  Notícias: '#f59e0b',
  Tutoriais: '#3b82f6',
  Avaliações: '#8b5cf6',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

type BodyPart =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; segments: { text: string; bold?: boolean; italic?: boolean }[] };

function parseMarkdown(body: string): BodyPart[] {
  const parts: BodyPart[] = [];
  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0);

  for (const block of paragraphs) {
    const trimmed = block.trim();

    if (trimmed.startsWith('# ')) {
      parts.push({ type: 'h1', text: trimmed.replace(/^# /, '') });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      parts.push({ type: 'h2', text: trimmed.replace(/^## /, '') });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      parts.push({ type: 'h3', text: trimmed.replace(/^### /, '') });
      continue;
    }

    const lines = trimmed.split('\n');
    const listLines = lines.filter((l) => l.startsWith('- ') || l.startsWith('* '));
    if (listLines.length > 0 && listLines.length === lines.length) {
      parts.push({
        type: 'list',
        items: listLines.map((l) => l.replace(/^[-*] /, '')),
      });
      continue;
    }

    // Parse bold (**) and italic (*) inline
    const raw = trimmed;
    const segments: { text: string; bold?: boolean; italic?: boolean }[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: raw.slice(lastIndex, match.index) });
      }
      const full = match[0];
      if (full.startsWith('**') && full.endsWith('**')) {
        segments.push({ text: full.slice(2, -2), bold: true });
      } else if (full.startsWith('*') && full.endsWith('*')) {
        segments.push({ text: full.slice(1, -1), italic: true });
      }
      lastIndex = match.index + full.length;
    }
    if (lastIndex < raw.length) {
      segments.push({ text: raw.slice(lastIndex) });
    }

    parts.push({ type: 'paragraph', segments });
  }

  return parts;
}

function BodyContent({ body }: { body: string }) {
  const parts = parseMarkdown(body);

  return (
    <View style={styles.bodyContainer}>
      {parts.map((part, i) => {
        if (part.type === 'h1') {
          return (
            <Text key={i} style={styles.h1}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'h2') {
          return (
            <Text key={i} style={styles.h2}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'h3') {
          return (
            <Text key={i} style={styles.h3}>
              {part.text}
            </Text>
          );
        }
        if (part.type === 'list') {
          return (
            <View key={i} style={styles.listBlock}>
              {part.items.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (part.type === 'paragraph') {
          return (
            <Text key={i} style={styles.paragraph}>
              {part.segments.map((seg, j) => (
                <Text
                  key={j}
                  style={[
                    seg.bold && styles.bold,
                    seg.italic && styles.italic,
                  ]}
                >
                  {seg.text}
                </Text>
              ))}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: article, isLoading, isError } = useArticle(slug ?? '');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !article) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#f8fafc" />
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon="document-text-outline"
          title="Artigo não encontrado"
          description="Este artigo pode ter sido removido ou não está disponível."
        />
      </SafeAreaView>
    );
  }

  const catColor = CATEGORY_COLORS[article.category] ?? '#3B82F6';
  const isProOnly = (article as typeof article & { isProOnly?: boolean }).isProOnly;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#f8fafc" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category + Pro badge */}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${catColor}20`, borderColor: catColor },
            ]}
          >
            <Text style={[styles.categoryText, { color: catColor }]}>{article.category}</Text>
          </View>
          {isProOnly && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={10} color="#a78bfa" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Date */}
        <Text style={styles.date}>{formatDate(article.publishedAt)}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Body */}
        <BodyContent body={article.body} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#141C2F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141C2F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#253349',
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2e1065',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bfa',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 32,
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#253349',
    marginBottom: 24,
  },
  bodyContainer: {
    gap: 16,
  },
  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 30,
  },
  h2: {
    fontSize: 19,
    fontWeight: '700',
    color: '#e2e8f0',
    lineHeight: 26,
    marginTop: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700',
    color: '#cbd5e1',
    lineHeight: 24,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 26,
  },
  bold: {
    fontWeight: '700',
    color: '#f8fafc',
  },
  italic: {
    fontStyle: 'italic',
    color: '#e2e8f0',
  },
  listBlock: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: '#818CF8',
    lineHeight: 26,
    width: 12,
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: '#cbd5e1',
    lineHeight: 26,
  },
});
