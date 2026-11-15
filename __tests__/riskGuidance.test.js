import { dadosGravidade, formatarRaio, orientacaoDoRisco } from '../services/riskGuidance';

describe('formatarRaio', () => {
  it('mostra em metros abaixo de 1 km', () => {
    expect(formatarRaio(500)).toBe('500 m');
  });

  it('mostra em km a partir de 1 km', () => {
    expect(formatarRaio(1000)).toBe('1 km');
    expect(formatarRaio(2500)).toBe('2.5 km');
  });

  it('usa 1 km quando o raio não é informado', () => {
    expect(formatarRaio()).toBe('1 km');
  });
});

describe('dadosGravidade', () => {
  it('devolve a cor da gravidade pedida', () => {
    expect(dadosGravidade('Emergência').cor).toBe('#d93025');
  });

  it('usa "Atenção" para gravidade vazia ou desconhecida', () => {
    expect(dadosGravidade().label).toBe('Atenção');
    expect(dadosGravidade('Inexistente').label).toBe('Atenção');
  });
});

describe('orientacaoDoRisco', () => {
  it('traz a orientação específica do tipo de risco', () => {
    expect(orientacaoDoRisco('Deslizamento')).toMatch(/encostas/);
  });

  it('traz uma orientação genérica para tipos sem texto próprio', () => {
    expect(orientacaoDoRisco('Granizo')).toMatch(/orientações das autoridades/);
  });
});
