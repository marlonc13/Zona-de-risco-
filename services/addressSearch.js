const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const cache = new Map();
let ultimaConsulta = 0;

const aguardar = milissegundos => new Promise(resolve => setTimeout(resolve, milissegundos));

export async function pesquisarEnderecos(termo) {
  const consulta = termo.trim();
  if (consulta.length < 3) return [];

  const chave = consulta.toLocaleLowerCase('pt-BR');
  if (cache.has(chave)) return cache.get(chave);

  const intervalo = Date.now() - ultimaConsulta;
  if (intervalo < 1100) await aguardar(1100 - intervalo);
  ultimaConsulta = Date.now();

  const parametros = new URLSearchParams({
    q: consulta,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'br',
    limit: '5',
  });

  const resposta = await fetch(`${ENDPOINT}?${parametros.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
      'User-Agent': 'ZonaDeRiscoTCC/1.0 (contato: alinelasneau@gmail.com)',
    },
  });

  if (!resposta.ok) throw new Error(`Falha na pesquisa de endereço: ${resposta.status}`);

  const dados = await resposta.json();
  const resultados = dados.map(item => ({
    id: String(item.place_id),
    endereco: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    tipo: item.type || item.addresstype || 'local',
  }));

  cache.set(chave, resultados);
  return resultados;
}
