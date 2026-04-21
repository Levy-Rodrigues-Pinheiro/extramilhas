/**
 * Dados estáticos das alianças aéreas. Não muda frequentemente — hardcoded
 * é OK. Programa → aliança → benefícios/parceiros.
 *
 * Fontes: sites oficiais das alianças (out 2024).
 */

export type AllianceCode = 'STAR_ALLIANCE' | 'ONEWORLD' | 'SKYTEAM' | 'UNALIGNED';

export interface AlliancePartner {
  airlineCode: string; // IATA 2-letter
  airlineName: string;
  programName: string;
  programSlug: string | null; // se tem programa brasileiro, linkamos
  country: string;
}

export interface Alliance {
  code: AllianceCode;
  name: string;
  description: string;
  memberCount: number;
  hubs: string[]; // IATA codes principais
  partners: AlliancePartner[];
}

export const ALLIANCES: Record<AllianceCode, Alliance> = {
  STAR_ALLIANCE: {
    code: 'STAR_ALLIANCE',
    name: 'Star Alliance',
    description:
      'Maior aliança global, 26 cias. Forte na Europa, Ásia e Américas. Cruza Smiles+United+Lufthansa+Singapore.',
    memberCount: 26,
    hubs: ['FRA', 'MUC', 'EWR', 'ORD', 'LAX', 'SFO', 'SIN', 'HKG', 'NRT', 'BKK'],
    partners: [
      { airlineCode: 'G3', airlineName: 'GOL', programName: 'Smiles', programSlug: 'smiles', country: 'BR' },
      { airlineCode: 'UA', airlineName: 'United Airlines', programName: 'MileagePlus', programSlug: null, country: 'US' },
      { airlineCode: 'LH', airlineName: 'Lufthansa', programName: 'Miles & More', programSlug: null, country: 'DE' },
      { airlineCode: 'SQ', airlineName: 'Singapore Airlines', programName: 'KrisFlyer', programSlug: null, country: 'SG' },
      { airlineCode: 'TG', airlineName: 'Thai Airways', programName: 'Royal Orchid Plus', programSlug: null, country: 'TH' },
      { airlineCode: 'OS', airlineName: 'Austrian Airlines', programName: 'Miles & More', programSlug: null, country: 'AT' },
      { airlineCode: 'LX', airlineName: 'Swiss Intl', programName: 'Miles & More', programSlug: null, country: 'CH' },
      { airlineCode: 'AC', airlineName: 'Air Canada', programName: 'Aeroplan', programSlug: null, country: 'CA' },
      { airlineCode: 'TK', airlineName: 'Turkish Airlines', programName: 'Miles&Smiles', programSlug: null, country: 'TR' },
      { airlineCode: 'ET', airlineName: 'Ethiopian Airlines', programName: 'ShebaMiles', programSlug: null, country: 'ET' },
    ],
  },
  ONEWORLD: {
    code: 'ONEWORLD',
    name: 'Oneworld',
    description:
      'Aliança premium, 14 cias. Forte em transatlânticas. Cruza Latam+AA+British Airways+Qatar.',
    memberCount: 14,
    hubs: ['DFW', 'LHR', 'DOH', 'HKG', 'MAD', 'NRT'],
    partners: [
      { airlineCode: 'LA', airlineName: 'LATAM', programName: 'Latam Pass', programSlug: 'latampass', country: 'BR' },
      { airlineCode: 'AA', airlineName: 'American Airlines', programName: 'AAdvantage', programSlug: null, country: 'US' },
      { airlineCode: 'BA', airlineName: 'British Airways', programName: 'Executive Club', programSlug: null, country: 'GB' },
      { airlineCode: 'QR', airlineName: 'Qatar Airways', programName: 'Privilege Club', programSlug: null, country: 'QA' },
      { airlineCode: 'CX', airlineName: 'Cathay Pacific', programName: 'Asia Miles', programSlug: null, country: 'HK' },
      { airlineCode: 'QF', airlineName: 'Qantas', programName: 'Qantas Frequent Flyer', programSlug: null, country: 'AU' },
      { airlineCode: 'AY', airlineName: 'Finnair', programName: 'Finnair Plus', programSlug: null, country: 'FI' },
      { airlineCode: 'IB', airlineName: 'Iberia', programName: 'Iberia Plus', programSlug: null, country: 'ES' },
      { airlineCode: 'JL', airlineName: 'Japan Airlines', programName: 'JAL Mileage Bank', programSlug: null, country: 'JP' },
    ],
  },
  SKYTEAM: {
    code: 'SKYTEAM',
    name: 'SkyTeam',
    description:
      'Aliança com 19 cias. Forte na Europa continental + Ásia. Cruza Azul (!) via parceria + Air France + Delta + KLM.',
    memberCount: 19,
    hubs: ['CDG', 'AMS', 'ATL', 'DTW', 'SLC', 'ICN'],
    partners: [
      { airlineCode: 'AD', airlineName: 'Azul (afiliada)', programName: 'TudoAzul', programSlug: 'tudoazul', country: 'BR' },
      { airlineCode: 'AF', airlineName: 'Air France', programName: 'Flying Blue', programSlug: null, country: 'FR' },
      { airlineCode: 'KL', airlineName: 'KLM', programName: 'Flying Blue', programSlug: null, country: 'NL' },
      { airlineCode: 'DL', airlineName: 'Delta', programName: 'SkyMiles', programSlug: null, country: 'US' },
      { airlineCode: 'KE', airlineName: 'Korean Air', programName: 'SKYPASS', programSlug: null, country: 'KR' },
      { airlineCode: 'VS', airlineName: 'Virgin Atlantic', programName: 'Flying Club', programSlug: null, country: 'GB' },
      { airlineCode: 'SV', airlineName: 'Saudia', programName: 'Alfursan', programSlug: null, country: 'SA' },
      { airlineCode: 'GA', airlineName: 'Garuda Indonesia', programName: 'GarudaMiles', programSlug: null, country: 'ID' },
    ],
  },
  UNALIGNED: {
    code: 'UNALIGNED',
    name: 'Sem aliança',
    description: 'Programa independente sem membership em alianças globais.',
    memberCount: 0,
    hubs: [],
    partners: [],
  },
};

/**
 * Mapeamento programa (slug) → aliança. Ajuda a resolver "se tenho Smiles,
 * posso resgatar em que cias?"
 */
export const PROGRAM_TO_ALLIANCE: Record<string, AllianceCode> = {
  smiles: 'STAR_ALLIANCE',
  latampass: 'ONEWORLD',
  tudoazul: 'SKYTEAM', // via partnership, não membership completa
  // Programas bancários (Livelo, Esfera) não têm aliança — viram parceiros via transferência
  livelo: 'UNALIGNED',
  esfera: 'UNALIGNED',
  membership: 'UNALIGNED', // Amex MR
};
