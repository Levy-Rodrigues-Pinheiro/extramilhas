/**
 * IATA → cidade/país/região. Cobre os aeroportos mais usados no Brasil + destinos populares.
 * Fallback: retorna o próprio IATA como destinationName e 'Internacional' como país.
 *
 * Mantido em arquivo separado porque é usado tanto pelo FlightSearchService
 * (para enriquecer resultados live sem AwardChart) quanto por outros serviços no futuro.
 */

export interface IataInfo {
  city: string;
  country: string;
  region:
    | 'domestic'
    | 'south_america'
    | 'central_america'
    | 'north_america'
    | 'europe'
    | 'middle_east'
    | 'asia'
    | 'oceania'
    | 'africa';
}

export const IATA_DATA: Record<string, IataInfo> = {
  // Brasil — domésticos principais
  GRU: { city: 'São Paulo', country: 'Brasil', region: 'domestic' },
  CGH: { city: 'São Paulo', country: 'Brasil', region: 'domestic' },
  VCP: { city: 'Campinas', country: 'Brasil', region: 'domestic' },
  GIG: { city: 'Rio de Janeiro', country: 'Brasil', region: 'domestic' },
  SDU: { city: 'Rio de Janeiro', country: 'Brasil', region: 'domestic' },
  BSB: { city: 'Brasília', country: 'Brasil', region: 'domestic' },
  CNF: { city: 'Belo Horizonte', country: 'Brasil', region: 'domestic' },
  PLU: { city: 'Belo Horizonte', country: 'Brasil', region: 'domestic' },
  SSA: { city: 'Salvador', country: 'Brasil', region: 'domestic' },
  REC: { city: 'Recife', country: 'Brasil', region: 'domestic' },
  FOR: { city: 'Fortaleza', country: 'Brasil', region: 'domestic' },
  POA: { city: 'Porto Alegre', country: 'Brasil', region: 'domestic' },
  CWB: { city: 'Curitiba', country: 'Brasil', region: 'domestic' },
  FLN: { city: 'Florianópolis', country: 'Brasil', region: 'domestic' },
  NAT: { city: 'Natal', country: 'Brasil', region: 'domestic' },
  BEL: { city: 'Belém', country: 'Brasil', region: 'domestic' },
  MAO: { city: 'Manaus', country: 'Brasil', region: 'domestic' },
  IGU: { city: 'Foz do Iguaçu', country: 'Brasil', region: 'domestic' },
  MCZ: { city: 'Maceió', country: 'Brasil', region: 'domestic' },
  JPA: { city: 'João Pessoa', country: 'Brasil', region: 'domestic' },
  AJU: { city: 'Aracaju', country: 'Brasil', region: 'domestic' },
  THE: { city: 'Teresina', country: 'Brasil', region: 'domestic' },
  SLZ: { city: 'São Luís', country: 'Brasil', region: 'domestic' },
  CGB: { city: 'Cuiabá', country: 'Brasil', region: 'domestic' },
  CGR: { city: 'Campo Grande', country: 'Brasil', region: 'domestic' },
  GYN: { city: 'Goiânia', country: 'Brasil', region: 'domestic' },
  VIX: { city: 'Vitória', country: 'Brasil', region: 'domestic' },
  PMW: { city: 'Palmas', country: 'Brasil', region: 'domestic' },
  PVH: { city: 'Porto Velho', country: 'Brasil', region: 'domestic' },
  RBR: { city: 'Rio Branco', country: 'Brasil', region: 'domestic' },
  BPS: { city: 'Porto Seguro', country: 'Brasil', region: 'domestic' },
  IOS: { city: 'Ilhéus', country: 'Brasil', region: 'domestic' },
  PNZ: { city: 'Petrolina', country: 'Brasil', region: 'domestic' },
  NVT: { city: 'Navegantes', country: 'Brasil', region: 'domestic' },

  // América do Sul
  EZE: { city: 'Buenos Aires', country: 'Argentina', region: 'south_america' },
  AEP: { city: 'Buenos Aires', country: 'Argentina', region: 'south_america' },
  MVD: { city: 'Montevidéu', country: 'Uruguai', region: 'south_america' },
  SCL: { city: 'Santiago', country: 'Chile', region: 'south_america' },
  LIM: { city: 'Lima', country: 'Peru', region: 'south_america' },
  BOG: { city: 'Bogotá', country: 'Colômbia', region: 'south_america' },
  UIO: { city: 'Quito', country: 'Equador', region: 'south_america' },
  GYE: { city: 'Guayaquil', country: 'Equador', region: 'south_america' },
  CCS: { city: 'Caracas', country: 'Venezuela', region: 'south_america' },
  ASU: { city: 'Assunção', country: 'Paraguai', region: 'south_america' },
  LPB: { city: 'La Paz', country: 'Bolívia', region: 'south_america' },
  VVI: { city: 'Santa Cruz de la Sierra', country: 'Bolívia', region: 'south_america' },

  // América Central & Caribe
  CUN: { city: 'Cancún', country: 'México', region: 'central_america' },
  MEX: { city: 'Cidade do México', country: 'México', region: 'central_america' },
  PTY: { city: 'Cidade do Panamá', country: 'Panamá', region: 'central_america' },
  SJO: { city: 'San José', country: 'Costa Rica', region: 'central_america' },
  HAV: { city: 'Havana', country: 'Cuba', region: 'central_america' },
  PUJ: { city: 'Punta Cana', country: 'República Dominicana', region: 'central_america' },
  SDQ: { city: 'Santo Domingo', country: 'República Dominicana', region: 'central_america' },

  // América do Norte
  MIA: { city: 'Miami', country: 'EUA', region: 'north_america' },
  JFK: { city: 'Nova York', country: 'EUA', region: 'north_america' },
  EWR: { city: 'Nova York', country: 'EUA', region: 'north_america' },
  LGA: { city: 'Nova York', country: 'EUA', region: 'north_america' },
  MCO: { city: 'Orlando', country: 'EUA', region: 'north_america' },
  LAX: { city: 'Los Angeles', country: 'EUA', region: 'north_america' },
  FLL: { city: 'Fort Lauderdale', country: 'EUA', region: 'north_america' },
  BOS: { city: 'Boston', country: 'EUA', region: 'north_america' },
  ORD: { city: 'Chicago', country: 'EUA', region: 'north_america' },
  DFW: { city: 'Dallas', country: 'EUA', region: 'north_america' },
  ATL: { city: 'Atlanta', country: 'EUA', region: 'north_america' },
  IAH: { city: 'Houston', country: 'EUA', region: 'north_america' },
  SFO: { city: 'São Francisco', country: 'EUA', region: 'north_america' },
  SEA: { city: 'Seattle', country: 'EUA', region: 'north_america' },
  LAS: { city: 'Las Vegas', country: 'EUA', region: 'north_america' },
  YYZ: { city: 'Toronto', country: 'Canadá', region: 'north_america' },
  YUL: { city: 'Montreal', country: 'Canadá', region: 'north_america' },

  // Europa
  LIS: { city: 'Lisboa', country: 'Portugal', region: 'europe' },
  OPO: { city: 'Porto', country: 'Portugal', region: 'europe' },
  MAD: { city: 'Madri', country: 'Espanha', region: 'europe' },
  BCN: { city: 'Barcelona', country: 'Espanha', region: 'europe' },
  CDG: { city: 'Paris', country: 'França', region: 'europe' },
  ORY: { city: 'Paris', country: 'França', region: 'europe' },
  LHR: { city: 'Londres', country: 'Reino Unido', region: 'europe' },
  LGW: { city: 'Londres', country: 'Reino Unido', region: 'europe' },
  FCO: { city: 'Roma', country: 'Itália', region: 'europe' },
  MXP: { city: 'Milão', country: 'Itália', region: 'europe' },
  FRA: { city: 'Frankfurt', country: 'Alemanha', region: 'europe' },
  MUC: { city: 'Munique', country: 'Alemanha', region: 'europe' },
  AMS: { city: 'Amsterdã', country: 'Holanda', region: 'europe' },
  ZRH: { city: 'Zurique', country: 'Suíça', region: 'europe' },
  VIE: { city: 'Viena', country: 'Áustria', region: 'europe' },
  IST: { city: 'Istambul', country: 'Turquia', region: 'europe' },
  ATH: { city: 'Atenas', country: 'Grécia', region: 'europe' },

  // Oriente Médio
  DXB: { city: 'Dubai', country: 'Emirados Árabes', region: 'middle_east' },
  DOH: { city: 'Doha', country: 'Catar', region: 'middle_east' },
  AUH: { city: 'Abu Dhabi', country: 'Emirados Árabes', region: 'middle_east' },
  TLV: { city: 'Tel Aviv', country: 'Israel', region: 'middle_east' },

  // Ásia
  NRT: { city: 'Tóquio', country: 'Japão', region: 'asia' },
  HND: { city: 'Tóquio', country: 'Japão', region: 'asia' },
  ICN: { city: 'Seul', country: 'Coreia do Sul', region: 'asia' },
  PEK: { city: 'Pequim', country: 'China', region: 'asia' },
  PVG: { city: 'Xangai', country: 'China', region: 'asia' },
  HKG: { city: 'Hong Kong', country: 'Hong Kong', region: 'asia' },
  SIN: { city: 'Singapura', country: 'Singapura', region: 'asia' },
  BKK: { city: 'Bangcoc', country: 'Tailândia', region: 'asia' },
  KUL: { city: 'Kuala Lumpur', country: 'Malásia', region: 'asia' },
  DEL: { city: 'Nova Déli', country: 'Índia', region: 'asia' },
  BOM: { city: 'Mumbai', country: 'Índia', region: 'asia' },

  // Oceania
  SYD: { city: 'Sydney', country: 'Austrália', region: 'oceania' },
  MEL: { city: 'Melbourne', country: 'Austrália', region: 'oceania' },
  AKL: { city: 'Auckland', country: 'Nova Zelândia', region: 'oceania' },

  // África
  JNB: { city: 'Joanesburgo', country: 'África do Sul', region: 'africa' },
  CPT: { city: 'Cidade do Cabo', country: 'África do Sul', region: 'africa' },
  CAI: { city: 'Cairo', country: 'Egito', region: 'africa' },
  ADD: { city: 'Adis Abeba', country: 'Etiópia', region: 'africa' },
};

/** Retorna info do IATA. Se desconhecido, retorna fallback com o próprio código. */
export function getIataInfo(iata: string): IataInfo {
  const code = iata.toUpperCase();
  return (
    IATA_DATA[code] || {
      city: code,
      country: 'Internacional',
      region: 'europe', // default neutro para preços de fallback
    }
  );
}
