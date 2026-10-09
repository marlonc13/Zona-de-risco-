let cache = null;
const DEZ_MINUTOS = 10 * 60 * 1000;

function descricaoCodigo(codigo) {
  if (codigo === 0) return 'Céu limpo';
  if ([1, 2, 3].includes(codigo)) return 'Parcialmente nublado';
  if ([45, 48].includes(codigo)) return 'Neblina';
  if (codigo >= 51 && codigo <= 67) return 'Chuva';
  if (codigo >= 80 && codigo <= 82) return 'Pancadas de chuva';
  if (codigo >= 95) return 'Tempestade';
  return 'Tempo variável';
}

export async function buscarClimaAtual(coordenadas) {
  if (!coordenadas) return null;

  const mesmaArea = cache
    && Math.abs(cache.latitude - coordenadas.latitude) < 0.02
    && Math.abs(cache.longitude - coordenadas.longitude) < 0.02;

  if (mesmaArea && Date.now() - cache.consultadoEm < DEZ_MINUTOS) return cache.dados;

  const parametros = new URLSearchParams({
    latitude: String(coordenadas.latitude),
    longitude: String(coordenadas.longitude),
    current: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
    timezone: 'auto',
  });

  const resposta = await fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`);
  if (!resposta.ok) throw new Error('Não foi possível consultar o clima.');
  const json = await resposta.json();
  const atual = json.current;
  const dados = {
    temperatura: atual?.temperature_2m,
    chuva: atual?.precipitation,
    vento: atual?.wind_speed_10m,
    descricao: descricaoCodigo(atual?.weather_code),
  };

  cache = { latitude: coordenadas.latitude, longitude: coordenadas.longitude, consultadoEm: Date.now(), dados };
  return dados;
}
