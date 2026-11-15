// Configuração do Babel usada SOMENTE pelos testes (o app continua com o padrão do Expo).
// O Jest não executa import() dinâmico sem flag experimental do Node, então nos testes
// ele vira require(); no app o Metro continua tratando import() normalmente.
module.exports = {
  extends: require.resolve('expo/internal/babel-preset'),
  plugins: ['@babel/plugin-transform-dynamic-import'],
};
