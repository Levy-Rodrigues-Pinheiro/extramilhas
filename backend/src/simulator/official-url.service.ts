import { Injectable } from '@nestjs/common';

/**
 * Responsável por construir deep-links para os sites oficiais (Smiles, Voe Azul, LATAM).
 *
 * Cada site tem formato próprio de data e params. Extraído do FlightSearchService
 * pra ser facilmente testável e versionável — quando uma companhia mudar URL a gente
 * atualiza aqui sem tocar no orquestrador.
 */
@Injectable()
export class OfficialUrlService {
  /**
   * Gera URL que, ao abrir no browser, leva o usuário direto à página de seleção
   * de voos do programa com a rota já preenchida — o mais perto de "ir direto à
   * oferta" que é possível sem token de sessão.
   */
  build(params: {
    programSlug: string;
    origin: string;
    destination: string;
    date: string;
    cabin: string;
    passengers: number;
    returnDate?: string;
  }): string {
    const { programSlug, origin, destination, date, cabin, returnDate } = params;
    const pax = Math.max(1, params.passengers || 1);
    const isRT = !!returnDate;
    const cabinLc = (cabin || 'economy').toLowerCase();
    const safeDate = date || this.defaultDate();

    if (programSlug === 'smiles') {
      const cabinType = cabinLc === 'business' || cabinLc === 'first' ? 'BUSINESS' : 'ECONOMIC';
      const tripType = isRT ? 2 : 1;
      const p = new URLSearchParams({
        originAirportCode: origin,
        destinationAirportCode: destination,
        departureDate: safeDate,
        adults: String(pax),
        children: '0',
        infants: '0',
        cabinType,
        tripType: String(tripType),
        currencyCode: 'BRL',
        segments: '1',
      });
      if (returnDate) p.set('returnDate', returnDate);
      return `https://www.smiles.com.br/emissao?${p.toString()}`;
    }

    if (programSlug === 'tudoazul') {
      const cc = cabinLc === 'business' || cabinLc === 'first' ? 'business' : 'economy';
      const p = new URLSearchParams({
        o1: origin,
        d1: destination,
        dd1: this.formatDate('tudoazul', safeDate),
        'passengers.adults': String(pax),
        'passengers.children': '0',
        'passengers.infants': '0',
        r: isRT ? 'true' : 'false',
        cc,
        isAward: 'true',
      });
      if (returnDate) {
        p.set('o2', destination);
        p.set('d2', origin);
        p.set('dd2', this.formatDate('tudoazul', returnDate));
      }
      return `https://www.voeazul.com.br/br/pt/home/selecao-de-voos?${p.toString()}`;
    }

    if (programSlug === 'latampass') {
      const cabinLatam = cabinLc === 'business' || cabinLc === 'first' ? 'Business' : 'Economy';
      const trip = isRT ? 'RT' : 'OW';
      const p = new URLSearchParams({
        origin,
        destination,
        outbound: this.formatDate('latampass', safeDate),
        adt: String(pax),
        chd: '0',
        inf: '0',
        trip,
        cabin: cabinLatam,
        redemption: 'true',
        sort: 'RECOMMENDED',
      });
      if (returnDate) p.set('inbound', this.formatDate('latampass', returnDate));
      return `https://www.latamairlines.com/br/pt/oferta-voos?${p.toString()}`;
    }

    // Fallback — Google Flights (aceita qualquer rota)
    return `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${destination}+on+${safeDate}&hl=pt-BR&curr=BRL`;
  }

  /** Converte yyyy-mm-dd pro formato aceito por cada programa. */
  formatDate(programSlug: string, isoDate: string): string {
    if (programSlug === 'tudoazul') {
      const [y, m, d] = isoDate.split('-');
      if (!y || !m || !d) return isoDate;
      return `${d}-${m}-${y}`;
    }
    if (programSlug === 'latampass') {
      return `${isoDate}T12:00:00.000Z`;
    }
    return isoDate;
  }

  private defaultDate(): string {
    // 30 dias no futuro — usado quando chamador não passou data
    return new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  }
}
