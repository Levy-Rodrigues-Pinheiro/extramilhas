import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { usePrograms, useSimulator } from '../../src/hooks/usePrograms';
import { getContributeState, setContributeState } from '../../src/lib/contribute-preference';
import { ContributeOptInModal } from '../../src/components/ContributeOptInModal';
import { useFlightSearch } from '../../src/hooks/useFlightSearch';
import { ProgramChip } from '../../src/components/ProgramChip';
import { Colors } from '../../src/lib/theme';
import type { CabinClass, MaxStops, SimulatorResult } from '../../src/types';

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] || '0';
  const m = match[2] || '0';
  return `${h}h${m}min`;
}

// Database of airports for autocomplete
const AIRPORTS = [
  { code: 'GRU', city: 'São Paulo', name: 'Guarulhos', country: 'Brasil' },
  { code: 'CGH', city: 'São Paulo', name: 'Congonhas', country: 'Brasil' },
  { code: 'GIG', city: 'Rio de Janeiro', name: 'Galeão', country: 'Brasil' },
  { code: 'SDU', city: 'Rio de Janeiro', name: 'Santos Dumont', country: 'Brasil' },
  { code: 'BSB', city: 'Brasília', name: 'Internacional', country: 'Brasil' },
  { code: 'CNF', city: 'Belo Horizonte', name: 'Confins', country: 'Brasil' },
  { code: 'SSA', city: 'Salvador', name: 'Dep. Luís E. Magalhães', country: 'Brasil' },
  { code: 'REC', city: 'Recife', name: 'Guararapes', country: 'Brasil' },
  { code: 'FOR', city: 'Fortaleza', name: 'Pinto Martins', country: 'Brasil' },
  { code: 'POA', city: 'Porto Alegre', name: 'Salgado Filho', country: 'Brasil' },
  { code: 'CWB', city: 'Curitiba', name: 'Afonso Pena', country: 'Brasil' },
  { code: 'VCP', city: 'Campinas', name: 'Viracopos', country: 'Brasil' },
  { code: 'FLN', city: 'Florianópolis', name: 'Hercílio Luz', country: 'Brasil' },
  { code: 'NAT', city: 'Natal', name: 'Augusto Severo', country: 'Brasil' },
  { code: 'BEL', city: 'Belém', name: 'Val de Cans', country: 'Brasil' },
  { code: 'MAO', city: 'Manaus', name: 'Eduardo Gomes', country: 'Brasil' },
  // Internacionais populares
  { code: 'EZE', city: 'Buenos Aires', name: 'Ezeiza', country: 'Argentina' },
  { code: 'MVD', city: 'Montevideo', name: 'Carrasco', country: 'Uruguai' },
  { code: 'SCL', city: 'Santiago', name: 'Arturo Merino', country: 'Chile' },
  { code: 'LIM', city: 'Lima', name: 'Jorge Chávez', country: 'Peru' },
  { code: 'BOG', city: 'Bogotá', name: 'El Dorado', country: 'Colômbia' },
  { code: 'MIA', city: 'Miami', name: 'International', country: 'EUA' },
  { code: 'JFK', city: 'Nova York', name: 'John F. Kennedy', country: 'EUA' },
  { code: 'MCO', city: 'Orlando', name: 'International', country: 'EUA' },
  { code: 'LAX', city: 'Los Angeles', name: 'International', country: 'EUA' },
  { code: 'FLL', city: 'Fort Lauderdale', name: 'Hollywood', country: 'EUA' },
  { code: 'CUN', city: 'Cancún', name: 'International', country: 'México' },
  { code: 'LIS', city: 'Lisboa', name: 'Humberto Delgado', country: 'Portugal' },
  { code: 'MAD', city: 'Madri', name: 'Barajas', country: 'Espanha' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle', country: 'França' },
  { code: 'LHR', city: 'Londres', name: 'Heathrow', country: 'Reino Unido' },
  { code: 'FCO', city: 'Roma', name: 'Fiumicino', country: 'Itália' },
  { code: 'DXB', city: 'Dubai', name: 'International', country: 'Emirados Árabes' },
  { code: 'NRT', city: 'Tóquio', name: 'Narita', country: 'Japão' },
  { code: 'SYD', city: 'Sydney', name: 'Kingsford Smith', country: 'Austrália' },
  { code: 'BKK', city: 'Bangcoc', name: 'Suvarnabhumi', country: 'Tailândia' },
];

const CABIN_CLASSES: { value: CabinClass; label: string }[] = [
  { value: 'ECONOMY', label: 'Econômica' },
  { value: 'BUSINESS', label: 'Executiva' },
  { value: 'FIRST', label: 'Primeira' },
];

const STOPS_OPTIONS: { value: MaxStops; label: string }[] = [
  { value: 'DIRECT', label: 'Direto' },
  { value: 'ONE_STOP', label: '1 Parada' },
  { value: 'ANY', label: 'Qualquer' },
];

// Airport autocomplete input component
function AirportInput({
  label,
  icon,
  value,
  onSelect,
  placeholder,
}: {
  label: string;
  icon: string;
  value: string;
  onSelect: (code: string) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const selectedAirport = AIRPORTS.find((a) => a.code === value);
  const displayText = text || (selectedAirport ? `${selectedAirport.code} — ${selectedAirport.city}` : '');

  const suggestions = useMemo(() => {
    if (!text || text.length < 1) return [];
    const q = text.toLowerCase();
    return AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [text]);

  const handleSelect = (code: string) => {
    const airport = AIRPORTS.find((a) => a.code === code);
    setText('');
    setFocused(false);
    onSelect(code);
  };

  return (
    <View style={airportStyles.container}>
      <Text style={airportStyles.label}>{label}</Text>
      <View style={[airportStyles.inputRow, focused && airportStyles.inputRowFocused]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={focused ? '#818CF8' : '#64748B'} />
        <TextInput
          style={airportStyles.input}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          value={focused ? text : displayText}
          onChangeText={(t) => {
            setText(t);
            if (t === '') onSelect('');
          }}
          onFocus={() => {
            setFocused(true);
            setText('');
          }}
          onBlur={() => {
            setTimeout(() => setFocused(false), 200);
          }}
          autoCapitalize="characters"
        />
        {value && !focused && (
          <View style={airportStyles.validBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          </View>
        )}
      </View>
      {focused && suggestions.length > 0 && (
        <View style={airportStyles.suggestionsContainer}>
          {suggestions.map((a) => (
            <TouchableOpacity
              key={a.code}
              style={airportStyles.suggestionItem}
              onPress={() => handleSelect(a.code)}
              activeOpacity={0.7}
            >
              <View style={airportStyles.suggestionLeft}>
                <Text style={airportStyles.suggestionCode}>{a.code}</Text>
                <View>
                  <Text style={airportStyles.suggestionCity}>{a.city}</Text>
                  <Text style={airportStyles.suggestionName}>{a.name} • {a.country}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function DestinationCard({ result, userMiles }: { result: SimulatorResult; userMiles: number }) {
  const isAffordable = result.milesRequired <= userMiles;
  const isClose = !isAffordable && result.milesRequired <= userMiles * 1.2;

  const PROGRAM_URLS: Record<string, string> = {
    smiles: 'https://www.smiles.com.br/passagens-aereas',
    tudoazul: 'https://www.tudoazul.com.br/resgatar-pontos',
    latampass: 'https://www.latamairlines.com/br/pt/latam-pass',
    Smiles: 'https://www.smiles.com.br/passagens-aereas',
    TudoAzul: 'https://www.tudoazul.com.br/resgatar-pontos',
    'Latam Pass': 'https://www.latamairlines.com/br/pt/latam-pass',
  };

  const emissionUrl = result.emissionUrl
    || PROGRAM_URLS[result.programId]
    || PROGRAM_URLS[result.programName]
    || null;

  const handleEmit = () => {
    if (emissionUrl) {
      Linking.openURL(emissionUrl).catch(() =>
        Alert.alert('Erro', 'Não foi possível abrir o link de emissão.')
      );
    }
  };

  return (
    <View style={styles.destinationCard}>
      <View style={styles.destinationHeader}>
        <View style={styles.destinationInfo}>
          <Text style={styles.destinationCity}>{result.destination}</Text>
          <Text style={styles.destinationCountry}>{result.country}</Text>
          <Text style={styles.destinationProgram}>{result.programName}</Text>
        </View>
        <View style={styles.destinationRight}>
          <View
            style={[
              styles.milesBadge,
              {
                backgroundColor: isAffordable ? '#052e16' : isClose ? '#422006' : '#141C2F',
                borderColor: isAffordable ? '#166534' : isClose ? '#713f12' : '#253349',
              },
            ]}
          >
            <Text
              style={[
                styles.milesValue,
                { color: isAffordable ? '#22c55e' : isClose ? '#eab308' : '#94a3b8' },
              ]}
            >
              {(result.milesRequired ?? 0).toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.milesLabel}>milhas</Text>
          </View>
          <View style={styles.stopBadge}>
            <Ionicons
              name={result.isGoodOption ? 'star' : 'radio-button-on-outline'}
              size={12}
              color={result.isGoodOption ? '#eab308' : '#94a3b8'}
            />
            <Text style={[styles.stopText, result.isGoodOption && { color: '#eab308' }]}>
              {result.isGoodOption ? 'Boa opção' : 'Disponível'}
            </Text>
          </View>
        </View>
      </View>
      {emissionUrl && (
        <TouchableOpacity style={styles.emitButton} onPress={handleEmit} activeOpacity={0.7}>
          <Ionicons name="open-outline" size={14} color="#818CF8" />
          <Text style={styles.emitButtonText}>Ver no site oficial</Text>
          <Ionicons name="arrow-forward" size={14} color="#818CF8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function FlightResultCard({ result }: { result: any }) {
  const isRoundTrip = !!result.isRoundTrip;
  const pax = result.passengers || 1;
  const totalMiles = result.milesTotal ?? (isRoundTrip ? result.milesRoundTrip : result.milesOneWay) ?? 0;

  // Opt-in crowdsourcing — primeira vez que clica em "Ver preço oficial"
  const [optInVisible, setOptInVisible] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const openInWebView = (url: string) => {
    try {
      router.push({
        pathname: '/price-capture' as any,
        params: {
          url: encodeURIComponent(url),
          title: `${result.programName} — ${result.destination}`,
        },
      });
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleOfficialPress = async () => {
    const url = result.officialUrl || result.bookingUrl;
    if (!url) return;
    const state = await getContributeState();
    if (state === 'accepted') {
      openInWebView(url);
    } else if (state === 'declined') {
      // Respeita recusa anterior — abre no browser externo sem captura
      Linking.openURL(url).catch(() => {});
    } else {
      // Primeira vez — pergunta
      setPendingUrl(url);
      setOptInVisible(true);
    }
  };

  const handleAccept = async () => {
    await setContributeState('accepted');
    setOptInVisible(false);
    if (pendingUrl) openInWebView(pendingUrl);
    setPendingUrl(null);
  };

  const handleDecline = async () => {
    await setContributeState('declined');
    setOptInVisible(false);
    if (pendingUrl) Linking.openURL(pendingUrl).catch(() => {});
    setPendingUrl(null);
  };

  const recColor = result.recommendation === 'MILHAS' ? '#10B981'
    : result.recommendation === 'DINHEIRO' ? '#EF4444' : '#F59E0B';
  const recIcon = result.recommendation === 'MILHAS' ? 'checkmark-circle'
    : result.recommendation === 'DINHEIRO' ? 'cash-outline' : 'swap-horizontal';
  const recText = result.recommendation === 'MILHAS' ? 'Use milhas! Mais barato'
    : result.recommendation === 'DINHEIRO' ? 'Pague em dinheiro' : 'Preço equivalente';

  return (
    <View style={styles.flightCard}>
      {/* Header: Program + Route + Live badge */}
      <View style={styles.flightHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.flightProgram}>{result.programName}</Text>
            {result.isLive ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>AO VIVO</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.flightRoute}>
            {result.origin} → {result.destination} ({result.destinationName})
          </Text>
          {result.flightNumber && (
            <View style={styles.flightDetails}>
              <Text style={styles.flightDetailText}>
                {result.flightNumber} • {result.departureTime?.slice(11, 16) || ''} → {result.arrivalTime?.slice(11, 16) || ''}
              </Text>
              {result.seatsAvailable != null && result.seatsAvailable < 5 && (
                <Text style={styles.seatsWarning}>Apenas {result.seatsAvailable} assento(s)!</Text>
              )}
            </View>
          )}
        </View>
        <View style={[styles.recBadge, { backgroundColor: recColor + '20', borderColor: recColor + '40' }]}>
          <Ionicons name={recIcon as keyof typeof Ionicons.glyphMap} size={12} color={recColor} />
          <Text style={[styles.recText, { color: recColor }]}>{result.recommendation}</Text>
        </View>
      </View>

      {/* Miles pricing */}
      <View style={styles.flightPricing}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>
            {`${isRoundTrip ? 'Ida e volta' : 'Só ida'} (${pax} pax)`}
          </Text>
          <Text style={styles.priceValueMiles}>{totalMiles.toLocaleString('pt-BR')}</Text>
          {isRoundTrip && (
            <Text style={styles.priceBreakdown}>
              {`${(result.milesOneWay / pax).toLocaleString('pt-BR')}/pax × ${isRoundTrip ? '2 trechos' : '1 trecho'}${pax > 1 ? ` × ${pax} pax` : ''}`}
            </Text>
          )}
          {result.taxBrl ? (
            <Text style={styles.taxInfo}>+ R${(result.taxBrl ?? 0).toFixed(2)} taxas</Text>
          ) : null}
        </View>
        <View style={styles.priceVs}>
          <Text style={styles.priceVsText}>vs</Text>
        </View>
        <View style={[styles.priceCol, { alignItems: 'flex-end' as const }]}>
          <Text style={styles.priceLabel}>{result.priceSource !== 'estimated' ? 'Preço real (R$)' : 'Preço estimado (R$)'}</Text>
          <Text style={styles.priceValueCash}>
            R${(result.estimatedTicketBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </Text>
          <Text style={styles.priceBreakdown}>
            Milhas custam ~R${(result.estimatedCashBrl ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </Text>
        </View>
      </View>

      {/* Price source indicator */}
      <View style={styles.priceSource}>
        <Ionicons
          name={result.priceSource !== 'estimated' ? 'globe-outline' : 'calculator-outline'}
          size={12}
          color={result.priceSource !== 'estimated' ? '#10B981' : '#64748B'}
        />
        <Text style={[styles.priceSourceText, result.priceSource === 'amadeus' && { color: '#10B981' }]}>
          {result.priceSource !== 'estimated'
            ? `Preço real${result.airline ? ` (${result.airline})` : ''}`
            : 'Preço estimado'}
        </Text>
        {result.flightDuration && (
          <Text style={styles.priceSourceText}> • {formatDuration(result.flightDuration)}</Text>
        )}
      </View>

      {/* Recommendation */}
      <View style={[styles.recBar, { backgroundColor: recColor + '10', borderColor: recColor + '30' }]}>
        <Ionicons name={recIcon as keyof typeof Ionicons.glyphMap} size={16} color={recColor} />
        <Text style={[styles.recBarText, { color: recColor }]}>{recText}</Text>
        {(result.savings ?? 0) > 0 && (
          <Text style={[styles.recSavings, { color: recColor }]}>
            Economia: R${(result.savings ?? 0).toLocaleString('pt-BR')} ({result.savingsPercent ?? 0}%)
          </Text>
        )}
      </View>

      {/* Transparency: data source indicator */}
      <View style={styles.transparencyBar}>
        <Ionicons
          name={result.dataQuality === 'AO_VIVO' ? 'pulse-outline' : 'information-circle-outline'}
          size={13}
          color={result.dataQuality === 'AO_VIVO' ? '#10B981' : '#F59E0B'}
        />
        <Text style={styles.transparencyText}>
          {result.disclaimer || 'Preço de referência. Confirme no site oficial.'}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.flightActions}>
        <View style={styles.flightMeta}>
          <Ionicons name={result.isDirectFlight ? 'airplane' : 'git-branch-outline'} size={12} color="#64748B" />
          <Text style={styles.flightMetaText}>
            {result.isDirectFlight ? 'Voo direto' : 'Com conexão'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.officialButton}
          onPress={handleOfficialPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.officialButtonGradient}
          >
            <Ionicons name="open-outline" size={16} color="#fff" />
            <Text style={styles.officialButtonText}>Ver preço oficial</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      {result.lastUpdatedAt && (
        <Text style={styles.lastUpdated}>
          Atualizado em {new Date(result.lastUpdatedAt).toLocaleDateString('pt-BR')}
        </Text>
      )}
      <ContributeOptInModal
        visible={optInVisible}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </View>
  );
}

export default function SimulatorScreen() {
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const simulator = useSimulator();
  const flightSearch = useFlightSearch();
  const [flightResults, setFlightResults] = useState<any[] | null>(null);

  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [origin, setOrigin] = useState('GRU');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState<CabinClass>('ECONOMY');
  const [maxStops, setMaxStops] = useState<MaxStops>('ANY');
  const [results, setResults] = useState<SimulatorResult[] | null>(null);

  const toggleProgram = (id: string) => {
    setSelectedPrograms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const formatDateInput = (text: string) => {
    const nums = text.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
    return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
  };

  const isValidDate = (d: string) => {
    if (!d || d.length < 10) return false;
    const [day, month, year] = d.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date > new Date() && !isNaN(date.getTime());
  };

  const classMap: Record<string, string> = {
    ECONOMY: 'economy',
    BUSINESS: 'business',
    FIRST: 'first',
  };

  const formatDate = (d: string) => {
    if (!d || d.length < 10) return undefined;
    const [day, month, year] = d.split('/');
    return `${year}-${month}-${day}`;
  };

  const handleSimulate = async () => {
    if (!origin) {
      Alert.alert('Atenção', 'Selecione o aeroporto de origem.');
      return;
    }

    const programSlugs =
      selectedPrograms.length > 0
        ? selectedPrograms.map((id) => programs?.find((p) => p.id === id)?.slug ?? id)
        : programs?.map((p) => p.slug) ?? [];

    if (destination) {
      // Rota específica: busca comparativa de voos (milhas vs dinheiro)
      try {
        const data = await flightSearch.mutateAsync({
          origin,
          destination,
          departDate: formatDate(departDate) || new Date().toISOString().split('T')[0],
          returnDate: formatDate(returnDate),
          cabinClass: classMap[cabinClass] || 'economy',
          passengers,
          programSlug: selectedPrograms.length === 1 ? programSlugs[0] : undefined,
        });
        setFlightResults(data);
        setResults(null);
      } catch (err: any) {
        const msg =
          err?.code === 'ECONNABORTED'
            ? 'Tempo esgotado. Verifique sua conexão e tente de novo.'
            : err?.response
            ? `Erro do servidor (HTTP ${err.response.status}). Tente novamente.`
            : err?.request
            ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
            : err?.message || 'Erro desconhecido ao buscar voos.';
        Alert.alert('Erro ao buscar voos', msg);
      }
    } else {
      // Sem destino: mostra todos os destinos possíveis
      try {
        const data = await simulator.mutateAsync({
          programIds: programSlugs,
          miles: 999999, // mostrar todos os destinos disponíveis
          cabinClass,
          maxStops,
          origin,
        });
        setResults(data);
        setFlightResults(null);
      } catch (err: any) {
        const msg =
          err?.code === 'ECONNABORTED'
            ? 'Tempo esgotado. Verifique sua conexão e tente de novo.'
            : err?.response
            ? `Erro do servidor (HTTP ${err.response.status}).`
            : err?.request
            ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
            : err?.message || 'Erro desconhecido.';
        Alert.alert('Erro ao buscar destinos', msg);
      }
    }
  };
  const isSearching = simulator.isPending || flightSearch.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Simulador de Viagem</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Program selector */}
        <Text style={styles.sectionLabel}>Programa de milhas</Text>
        {programsLoading ? (
          <ActivityIndicator color="#3B82F6" style={styles.loader} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
            style={styles.chipsList}
          >
            <ProgramChip
              label="Todos"
              selected={selectedPrograms.length === 0}
              onPress={() => setSelectedPrograms([])}
            />
            {programs?.map((p) => (
              <ProgramChip
                key={p.id}
                label={p.name}
                slug={p.slug}
                selected={selectedPrograms.includes(p.id)}
                onPress={() => toggleProgram(p.id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Origin & Destination */}
        <View style={styles.routeSection}>
          <AirportInput
            label="De onde você sai?"
            icon="airplane-outline"
            value={origin}
            onSelect={setOrigin}
            placeholder="Ex: GRU, São Paulo..."
          />
          <View style={styles.routeArrow}>
            <Ionicons name="arrow-down" size={18} color="#64748B" />
          </View>
          <AirportInput
            label="Para onde quer ir? (opcional)"
            icon="location-outline"
            value={destination}
            onSelect={setDestination}
            placeholder="Ex: MIA, Miami... ou deixe vazio"
          />
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateField}>
            <Text style={styles.sectionLabel}>Data de ida</Text>
            <View style={[styles.dateInputContainer, departDate && isValidDate(departDate) ? styles.dateInputValid : undefined]}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <TextInput
                style={styles.dateInput}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#475569"
                value={departDate}
                onChangeText={(t) => setDepartDate(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              {departDate && isValidDate(departDate) && (
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              )}
            </View>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.sectionLabel}>Data de volta</Text>
            <View style={[styles.dateInputContainer, returnDate && isValidDate(returnDate) ? styles.dateInputValid : undefined]}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <TextInput
                style={styles.dateInput}
                placeholder="dd/mm/aaaa"
                placeholderTextColor="#475569"
                value={returnDate}
                onChangeText={(t) => setReturnDate(formatDateInput(t))}
                keyboardType="numeric"
                maxLength={10}
              />
              {returnDate && isValidDate(returnDate) && (
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              )}
            </View>
          </View>
        </View>

        {/* Passengers */}
        <Text style={styles.sectionLabel}>Passageiros</Text>
        <View style={styles.passengersRow}>
          <TouchableOpacity
            style={styles.passengerButton}
            onPress={() => setPassengers(Math.max(1, passengers - 1))}
            activeOpacity={0.7}
            disabled={passengers <= 1}
          >
            <Ionicons name="remove" size={20} color={passengers <= 1 ? '#475569' : '#F8FAFC'} />
          </TouchableOpacity>
          <View style={styles.passengerDisplay}>
            <Ionicons name="people-outline" size={18} color="#818CF8" />
            <Text style={styles.passengerCount}>{passengers}</Text>
            <Text style={styles.passengerLabel}>{passengers === 1 ? 'passageiro' : 'passageiros'}</Text>
          </View>
          <TouchableOpacity
            style={styles.passengerButton}
            onPress={() => setPassengers(Math.min(9, passengers + 1))}
            activeOpacity={0.7}
            disabled={passengers >= 9}
          >
            <Ionicons name="add" size={20} color={passengers >= 9 ? '#475569' : '#F8FAFC'} />
          </TouchableOpacity>
        </View>

        {/* Cabin class */}
        <Text style={styles.sectionLabel}>Classe da cabine</Text>
        <View style={styles.optionRow}>
          {CABIN_CLASSES.map((cls) => (
            <TouchableOpacity
              key={cls.value}
              style={[
                styles.optionButton,
                cabinClass === cls.value && styles.optionButtonSelected,
              ]}
              onPress={() => setCabinClass(cls.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  cabinClass === cls.value && styles.optionButtonTextSelected,
                ]}
              >
                {cls.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Max stops */}
        <Text style={styles.sectionLabel}>Número de paradas</Text>
        <View style={styles.optionRow}>
          {STOPS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                maxStops === opt.value && styles.optionButtonSelected,
              ]}
              onPress={() => setMaxStops(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  maxStops === opt.value && styles.optionButtonTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Simulate button */}
        <TouchableOpacity
          style={[styles.simulateButtonOuter, isSearching && styles.simulateButtonDisabled]}
          onPress={handleSimulate}
          activeOpacity={0.85}
          disabled={isSearching}
        >
          <LinearGradient
            colors={['#3B82F6', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.simulateButton}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={destination ? "airplane-outline" : "search-outline"} size={20} color="#fff" />
                <Text style={styles.simulateButtonText}>
                  {destination ? 'Comparar Voos' : 'Simular Destinos'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Flight search results (specific route) */}
        {flightResults !== null && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              Comparação de Programas ({flightResults.length})
            </Text>
            {flightResults.length > 0 && (
              <Text style={styles.resultsSubtitle}>
                {flightResults[0]?.origin} → {flightResults[0]?.destination} • {flightResults[0]?.isRoundTrip ? 'Ida e volta' : 'Só ida'}
              </Text>
            )}
            {flightResults.length === 0 ? (
              <View style={styles.emptyResults}>
                <Ionicons name="airplane-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>
                  Nenhum programa encontrado para esta rota. Tente outro destino.
                </Text>
              </View>
            ) : (
              flightResults.map((r, i) => (
                <FlightResultCard key={`${r.programSlug}-${i}`} result={r} />
              ))
            )}
          </View>
        )}

        {/* Results */}
        {results !== null && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              Destinos possíveis ({results.length})
            </Text>
            {results.length === 0 ? (
              <View style={styles.emptyResults}>
                <Ionicons name="airplane-outline" size={40} color="#475569" />
                <Text style={styles.emptyText}>
                  Nenhum destino encontrado para as milhas e filtros selecionados.
                </Text>
              </View>
            ) : (
              results.map((r, i) => (
                <DestinationCard key={`${r.destinationCode}-${r.programId}-${i}`} result={r} userMiles={999999} />
              ))
            )}
          </View>
        )}

        {/* Disclaimer */}
        {(results !== null || flightResults !== null) && (
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={16} color="#64748B" />
            <Text style={styles.disclaimerText}>
              Os valores de milhas são baseados nas tabelas oficiais dos programas e podem variar conforme disponibilidade e data. Sempre confirme o preço final no site da companhia antes de emitir.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const airportStyles = StyleSheet.create({
  container: {
    marginBottom: 4,
    zIndex: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    borderWidth: 1,
    borderColor: '#253349',
  },
  inputRowFocused: {
    borderColor: '#818CF8',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
    height: '100%',
  },
  validBadge: {
    marginLeft: 4,
  },
  suggestionsContainer: {
    backgroundColor: '#1A2540',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#253349',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#253349',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#818CF8',
    width: 36,
  },
  suggestionCity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  suggestionName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 90,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
  chipsList: {
    marginBottom: 4,
  },
  chipsContainer: {
    paddingVertical: 2,
  },
  routeSection: {
    marginTop: 16,
  },
  routeArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dateField: {
    flex: 1,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: '#253349',
  },
  dateInputValid: {
    borderColor: '#10B98140',
  },
  dateInput: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
    height: '100%',
  },
  milesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141C2F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#253349',
    height: 50,
    paddingHorizontal: 14,
  },
  milesIcon: {
    marginRight: 10,
  },
  milesInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC',
    height: '100%',
  },
  milesUnit: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  passengersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  passengerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141C2F',
    borderWidth: 1,
    borderColor: '#253349',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141C2F',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#253349',
    minWidth: 160,
    justifyContent: 'center',
  },
  passengerCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  passengerLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#253349',
    backgroundColor: '#141C2F',
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: '#818CF8',
    backgroundColor: '#312E81',
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  optionButtonTextSelected: {
    color: '#818CF8',
  },
  simulateButtonOuter: {
    marginTop: 24,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    height: 54,
  },
  simulateButtonDisabled: {
    opacity: 0.6,
  },
  simulateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resultsSection: {
    marginTop: 28,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 14,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  destinationCard: {
    backgroundColor: '#141C2F',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#253349',
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  destinationInfo: {
    flex: 1,
    marginRight: 12,
  },
  destinationCity: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  destinationCountry: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  destinationProgram: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '600',
    marginTop: 3,
  },
  destinationRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  milesBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  milesValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  milesLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  stopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  emitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#253349',
  },
  emitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#818CF8',
    flex: 1,
  },
  flightCard: {
    backgroundColor: '#141C2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#253349',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  flightProgram: {
    fontSize: 16,
    fontWeight: '700',
    color: '#818CF8',
  },
  flightRoute: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  recText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flightPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  priceValueMiles: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  priceValueCash: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  priceBreakdown: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  priceVs: {
    width: 30,
    alignItems: 'center',
  },
  priceVsText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  priceSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  priceSourceText: {
    fontSize: 11,
    color: '#64748B',
  },
  recBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  recBarText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  recSavings: {
    fontSize: 12,
    fontWeight: '700',
  },
  flightActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flightMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#312E81',
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#818CF8',
  },
  transparencyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F59E0B10',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F59E0B20',
  },
  transparencyText: {
    fontSize: 11,
    color: '#F59E0B',
    flex: 1,
    lineHeight: 15,
  },
  officialButton: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  officialButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  officialButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    backgroundColor: '#141C2F',
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 16,
  },
  resultsSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  flightDetails: {
    marginTop: 4,
  },
  flightDetailText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  seatsWarning: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  taxInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
