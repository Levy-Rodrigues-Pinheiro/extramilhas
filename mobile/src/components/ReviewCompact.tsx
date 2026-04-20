import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useReviewSummary, useUpsertReview } from '../hooks/useReviews';
import { Colors } from '../lib/theme';

/**
 * Compact review widget embedado no card de oportunidade.
 * Mostra %funcionou agregado + dois botões (funcionou/não). Tap persiste.
 */
export function ReviewCompact({ partnershipId }: { partnershipId: string }) {
  const { t } = useTranslation();
  const { data: summary, isLoading } = useReviewSummary(partnershipId);
  const upsert = useUpsertReview();

  if (isLoading) {
    return (
      <View style={styles.box}>
        <ActivityIndicator size="small" color={Colors.primary.light} />
      </View>
    );
  }

  const myWorked = summary?.myReview?.worked;

  return (
    <View style={styles.box}>
      <View style={styles.summaryRow}>
        <Text style={styles.question}>{t('reviews.rated_worked')}</Text>
        {summary && summary.total > 0 && (
          <Text style={styles.stats}>
            {summary.percentWorked !== null ? `${summary.percentWorked}% ${t('common.yes')}` : ''}
            {' · '}
            {t(summary.total === 1 ? 'reviews.reviews_count_one' : 'reviews.reviews_count_other', {
              count: summary.total,
            })}
          </Text>
        )}
      </View>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={() => upsert.mutate({ partnershipId, worked: true })}
          disabled={upsert.isPending}
          style={[
            styles.btn,
            styles.btnWorked,
            myWorked === true && styles.btnWorkedActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.yes') + ' — funcionou'}
          accessibilityState={{ selected: myWorked === true }}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <Ionicons
            name="checkmark-circle"
            size={14}
            color={myWorked === true ? '#fff' : Colors.green.primary}
          />
          <Text
            style={[
              styles.btnText,
              { color: myWorked === true ? '#fff' : Colors.green.primary },
            ]}
          >
            {t('common.yes')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => upsert.mutate({ partnershipId, worked: false })}
          disabled={upsert.isPending}
          style={[
            styles.btn,
            styles.btnNot,
            myWorked === false && styles.btnNotActive,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('common.no') + ' — não funcionou'}
          accessibilityState={{ selected: myWorked === false }}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <Ionicons
            name="close-circle"
            size={14}
            color={myWorked === false ? '#fff' : Colors.red.primary}
          />
          <Text
            style={[
              styles.btnText,
              { color: myWorked === false ? '#fff' : Colors.red.primary },
            ]}
          >
            {t('common.no')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  question: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  stats: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnWorked: {
    backgroundColor: Colors.green.bg,
    borderColor: Colors.green.border,
  },
  btnWorkedActive: {
    backgroundColor: Colors.green.primary,
    borderColor: Colors.green.primary,
  },
  btnNot: {
    backgroundColor: Colors.red.bg ?? `${Colors.red.primary}18`,
    borderColor: Colors.red.border ?? `${Colors.red.primary}40`,
  },
  btnNotActive: {
    backgroundColor: Colors.red.primary,
    borderColor: Colors.red.primary,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
