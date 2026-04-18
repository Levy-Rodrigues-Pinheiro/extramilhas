/**
 * JavaScript injetado dentro do WebView que abre o site da companhia aérea.
 *
 * Estratégia:
 * 1. Fazer hook em `window.fetch` e `XMLHttpRequest` ANTES do site carregar seus scripts.
 * 2. Para cada response JSON que o site recebe, detectar se contém dados de voo
 *    (por shape — procurar numbers que parecem milhas em qualquer nesting).
 * 3. Quando achar, postar via `window.ReactNativeWebView.postMessage(...)`.
 * 4. No lado RN, receber a mensagem e enviar pro backend webhook.
 *
 * Princípio ético/legal:
 * - Só captura dados que o usuário JÁ está vendo na própria tela (dados públicos).
 * - Nenhum PII é coletado (nenhum nome, email, saldo — só preços/voos).
 * - Usuário opta por enviar (flag `allowContribute` no perfil).
 * - IP e cookies são DO USUÁRIO — Akamai aceita naturalmente.
 */

export const CAPTURE_SCRIPT = `
(function () {
  if (window.__extramilhasInjected) return; // idempotente
  window.__extramilhasInjected = true;

  var MILES_KEYS = [
    'miles','milhas','points','pointsAmount','pointsRequired',
    'milesRequired','milesAmount','fareMiles','fareAmount',
    'sumOfMiles','totalMiles','totalPoints','awardMiles',
    'amount','value','price','fare','cost',
    'redemption','redemptionPoints','paxFareMilesAmount','award','awardFare'
  ];
  var API_HINTS = [
    'flightsearch','airlines/search','flight-search','search/flights',
    'graphql','offers','availability','award','booking','fares','emission',
    '/bff/','/api/'
  ];

  function looksLikeFlight(n) {
    if (!n || typeof n !== 'object') return false;
    for (var i = 0; i < MILES_KEYS.length; i++) {
      var v = n[MILES_KEYS[i]];
      if (typeof v === 'number' && v >= 1000 && v <= 2000000) return true;
      if (typeof v === 'string') {
        var x = parseFloat(v.replace(/[.,]/g,''));
        if (!isNaN(x) && x >= 1000 && x <= 2000000) return true;
      }
    }
    return false;
  }

  function walkAndExtract(json) {
    var flights = [];
    var seen = new Set();
    var stack = [json];
    var depth = 0;
    while (stack.length && depth < 50000) {
      var node = stack.pop();
      depth++;
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) stack.push(node[i]);
        continue;
      }
      if (looksLikeFlight(node)) {
        var milesKey = MILES_KEYS.find(function(k){
          var v = node[k];
          if (typeof v === 'number' && v >= 1000 && v <= 2000000) return true;
          if (typeof v === 'string') {
            var x = parseFloat(v.replace(/[.,]/g,''));
            return !isNaN(x) && x >= 1000 && x <= 2000000;
          }
          return false;
        });
        var m = node[milesKey];
        var miles = typeof m === 'number' ? m : parseFloat(String(m).replace(/[.,]/g,''));
        var key = miles + '-' + (node.flightNumber || '') + '-' + (node.departure || node.departureTime || '');
        if (!seen.has(key)) {
          seen.add(key);
          flights.push({
            milesRequired: miles,
            taxBrl: node.taxes || node.tax || node.taxAmount || 0,
            airline: node.airline || node.carrierCode || node.operatingCarrier || node.marketingCarrier || '',
            flightNumber: node.flightNumber || node.number || node.flightCode || '',
            departureTime: node.departureTime || node.departure || node.departureDateTime || '',
            arrivalTime: node.arrivalTime || node.arrival || node.arrivalDateTime || '',
            stops: typeof node.stops === 'number' ? node.stops : 0,
            duration: node.duration || node.flightDuration || ''
          });
        }
      }
      Object.values(node).forEach(function(v){ stack.push(v); });
    }
    return flights;
  }

  function report(kind, url, flights) {
    if (!flights || !flights.length) return;
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'flight-capture',
        kind: kind,
        url: String(url).substring(0, 300),
        flights: flights.slice(0, 10),
        capturedAt: new Date().toISOString()
      }));
    } catch(e) {}
  }

  // Hook fetch
  var origFetch = window.fetch;
  window.fetch = function() {
    var req = arguments[0];
    var url = typeof req === 'string' ? req : (req && req.url) || '';
    var isHintMatch = API_HINTS.some(function(h){ return url.toLowerCase().indexOf(h) > -1; });
    return origFetch.apply(this, arguments).then(function(resp){
      if (!isHintMatch) return resp;
      try {
        var clone = resp.clone();
        var ct = clone.headers.get('content-type') || '';
        if (ct.indexOf('json') > -1) {
          clone.json().then(function(j){
            var flights = walkAndExtract(j);
            if (flights.length) report('fetch', url, flights);
          }).catch(function(){});
        }
      } catch(e){}
      return resp;
    });
  };

  // Hook XMLHttpRequest
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__emURL = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    var xhr = this;
    xhr.addEventListener('load', function(){
      try {
        var url = xhr.__emURL || '';
        var isHint = API_HINTS.some(function(h){ return String(url).toLowerCase().indexOf(h) > -1; });
        if (!isHint) return;
        var ct = xhr.getResponseHeader('content-type') || '';
        if (ct.indexOf('json') === -1) return;
        var j = JSON.parse(xhr.responseText);
        var flights = walkAndExtract(j);
        if (flights.length) report('xhr', url, flights);
      } catch(e){}
    });
    return origSend.apply(this, arguments);
  };

  // Sinal pro RN: injection pronta
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'injection-ready',
      href: location.href
    }));
  } catch(e){}
})();
true;
`;

/**
 * Dado um `officialUrl` (os deep-links que construímos no backend), extrai
 * origin/destination/date pra contextualizar os flights capturados.
 */
export function parseOfficialUrl(url: string): {
  programSlug: string;
  origin: string;
  destination: string;
  date: string;
  cabinClass: string;
} | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const p = u.searchParams;

    if (host.includes('smiles.com.br')) {
      return {
        programSlug: 'smiles',
        origin: p.get('originAirportCode') || p.get('originAirport') || '',
        destination: p.get('destinationAirportCode') || p.get('destinationAirport') || '',
        date: p.get('departureDate') || '',
        cabinClass: (p.get('cabinType') || 'ECONOMIC').toLowerCase().includes('busin') ? 'business' : 'economy',
      };
    }

    if (host.includes('voeazul.com.br')) {
      const dd1 = p.get('dd1') || ''; // dd-mm-yyyy
      const [dd, mm, yyyy] = dd1.split('-');
      return {
        programSlug: 'tudoazul',
        origin: p.get('o1') || '',
        destination: p.get('d1') || '',
        date: yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : '',
        cabinClass: p.get('cc') || 'economy',
      };
    }

    if (host.includes('latamairlines.com')) {
      const outbound = p.get('outbound') || '';
      return {
        programSlug: 'latampass',
        origin: p.get('origin') || '',
        destination: p.get('destination') || '',
        date: outbound.substring(0, 10),
        cabinClass: (p.get('cabin') || 'Economy').toLowerCase(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}
