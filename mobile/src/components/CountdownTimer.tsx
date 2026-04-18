import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownTimerProps {
  expiresAt: string;
  compact?: boolean;
}

function getTimeLeft(expiresAt: string) {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function CountdownTimer({ expiresAt, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!timeLeft) {
    return (
      <View style={styles.expiredBadge}>
        <Text style={styles.expiredText}>Expirado</Text>
      </View>
    );
  }

  if (compact) {
    const isUrgent = timeLeft.days === 0;
    return (
      <Text style={[styles.compact, isUrgent && styles.urgent]}>
        {timeLeft.days > 0
          ? `${timeLeft.days}d ${timeLeft.hours}h`
          : `${timeLeft.hours}h ${timeLeft.minutes}m`}
      </Text>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;

  return (
    <View style={styles.row}>
      <TimeUnit value={timeLeft.days} label="dias" urgent={isUrgent} />
      <Text style={styles.separator}>:</Text>
      <TimeUnit value={timeLeft.hours} label="h" urgent={isUrgent} />
      <Text style={styles.separator}>:</Text>
      <TimeUnit value={timeLeft.minutes} label="m" urgent={isUrgent} />
      <Text style={styles.separator}>:</Text>
      <TimeUnit value={timeLeft.seconds} label="s" urgent={isUrgent} />
    </View>
  );
}

function TimeUnit({
  value,
  label,
  urgent,
}: {
  value: number;
  label: string;
  urgent: boolean;
}) {
  return (
    <View style={[styles.unit, urgent && styles.urgentUnit]}>
      <Text style={[styles.unitValue, urgent && styles.urgentText]}>
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  unit: {
    alignItems: 'center',
    backgroundColor: '#0B1120',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 32,
  },
  urgentUnit: {
    backgroundColor: '#450a0a',
  },
  unitValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  unitLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 1,
  },
  urgentText: {
    color: '#ef4444',
  },
  separator: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  compact: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  urgent: {
    color: '#ef4444',
  },
  expiredBadge: {
    backgroundColor: '#141C2F',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  expiredText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
