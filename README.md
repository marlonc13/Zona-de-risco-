# Zona de Risco

Aplicativo Expo/React Native para mapear e compartilhar alertas de riscos naturais.

## Perfis do sistema

- **Visitante:** consulta o mapa e recebe alertas próximos enquanto usa o aplicativo.
- **Usuário cadastrado:** consulta alertas, mantém o perfil e cadastra/altera a residência.
- **Administrador:** acessa o painel administrativo, publica ocorrências e visualiza a lista completa.

O administrador inicial é `alinelasneau@gmail.com`. Para adicionar colegas, inclua os e-mails em `services/accessControl.js` e também na função `ehAdministrador` de `firestore.rules`.

Somente riscos naturais são cadastrados: alagamento, enchente, deslizamento, vendaval, seca e incêndio florestal.

## Recursos de segurança

- Gravidade do alerta: Atenção, Alerta ou Emergência;
- Área afetada configurável: 500 m, 1 km, 3 km ou 5 km;
- Círculo colorido no mapa indicando a zona afetada;
- Monitoramento da localização atual e da residência cadastrada;
- Orientações de segurança específicas para cada tipo de risco;
- Compatibilidade com alertas antigos, usando Atenção e 1 km como padrão.
- Painel administrativo com alertas ativos, encerrados e risco mais frequente;
- Edição, reativação, encerramento e exclusão de ocorrências;
- Selo de alerta oficial com datas de publicação e atualização;
- Condições meteorológicas atuais fornecidas pela Open-Meteo, sem chave de API.
- Aba de abrigos com fotos, situação, capacidade, recursos e acessibilidade;
- Categorias de abrigo temporário, ponto seguro e ponto de apoio;
- Ordenação por distância e abertura de rota no Google Maps;
- Cadastro, edição e exclusão de locais seguros somente por administradores.
- Pesquisa de locais e endereços com seleção do resultado e gravação precisa das coordenadas, disponível somente no cadastro administrativo.
- Modo de emergência acionado por alerta vermelho dentro da área do usuário ou da residência;
- Instruções de evacuação e checklist disponíveis no próprio aplicativo, mesmo sem internet;
- Ligações rápidas para Defesa Civil (199), Bombeiros (193) e SAMU (192).
- Histórico administrativo com filtros combináveis por período, bairro, tipo de risco e gravidade.
- Mapa de calor administrativo baseado no histórico, com intensidade por concentração e filtro por tipo de risco.
- Relatório administrativo com totais por tipo, gravidade, status e bairro, exportável em PDF.
- Tela completa de detalhes para cada ocorrência, com foto, dados, orientação, mapa da área afetada e abertura de rota.
- Cadastro de administradores pela administradora principal, usando o e-mail da conta;
- Trilha de auditoria mostrando qual administrador criou, editou, reativou ou encerrou cada alerta.
- Fotos de perfil, ocorrências e abrigos armazenadas no Firebase Storage, evitando o limite de tamanho do Firestore;
- Troca de senha com confirmação da senha atual e opção de visualizar os campos;
- Fluxo de entrada simplificado, sem uma segunda tela repetindo visitante ou conta.

## Como executar no Windows

### Requisitos

- Node.js 20 LTS instalado;
- aplicativo Expo Go atualizado no celular;
- computador e celular conectados à mesma rede Wi-Fi.

### Passo a passo

Abra o terminal **dentro desta pasta**, a mesma que contém o arquivo `package.json`, e execute:

```powershell
npm.cmd install
npx.cmd expo start --clear
```

Quando o QR Code aparecer, abra o Expo Go no celular e leia o código.

Se a rede da faculdade ou do computador bloquear a conexão, encerre com `Ctrl+C` e tente:

```powershell
npx.cmd expo start --tunnel --clear
```

## Verificações do projeto

```powershell
npm.cmd run lint
npx.cmd expo-doctor
```

## Configuração obrigatória do Firebase

No Firebase Console, abra o projeto usado em `services/firebaseConfig.js`:

1. Em **Authentication > Método de login**, ative E-mail/Senha.
2. Em **Firestore Database > Regras**, copie o conteúdo atualizado de `firestore.rules` e publique. Isso é obrigatório para liberar os administradores cadastrados pelo aplicativo.
3. Em **Storage > Regras**, copie o conteúdo de `storage.rules` e publique.
4. Crie a conta `alinelasneau@gmail.com` pelo próprio aplicativo ou pelo painel Authentication.

Sem publicar essas regras, o Firebase exibirá `Missing or insufficient permissions`.

## Localização, endereço e notificações

O aplicativo atualiza a localização aproximadamente a cada 60 segundos ou após deslocamento de 50 metros, enquanto está aberto. O usuário também pode cadastrar sua residência; quando ela estiver dentro da área de uma ocorrência, o mapa mostra um aviso.

Em uma development build, um alerta cuja área alcance a localização atual ou a residência gera uma notificação local uma vez. O Expo Go não oferece notificações Android completas a partir do SDK 53, mas o aviso visual dentro do mapa continua funcionando. Monitoramento com o aplicativo totalmente fechado exige uma development build própria e permissões de localização em segundo plano.

As informações meteorológicas são apenas auxiliares. Elas não publicam ocorrências automaticamente; somente um administrador pode criar um alerta oficial.

## Observações importantes

- Não execute os comandos dentro de uma pasta `area-de-risco` antiga ou duplicada.
- Não é necessário enviar nem copiar a pasta `node_modules`.
- O mapa usa um componente nativo. Para testar o aplicativo, prefira Android/iPhone com Expo Go em vez do navegador.
- O login, o armazenamento e os alertas dependem do projeto Firebase configurado em `services/firebaseConfig.js`.


## Melhorias implementadas (outubro de 2026)

- **Estatísticas detalhadas:** contagem por tipo, gravidade, situação, período e bairros, além do mapa de calor. A tela permanece rolável.
- **Perfil:** botão de retorno ao início/mapa; o nome e a foto continuam salvos no documento `usuarios/{uid}`.
- **Foto em Base64:** `services/imageUpload.js` converte a foto local em data URI Base64 antes de salvá-la no Firestore. O limite de arquivo é 600 KiB para manter o documento abaixo do limite do Firestore.
- **Alertas públicos:** a aba de histórico aparece para todos. Visitantes e usuários podem consultar alertas; ações de editar, alterar situação e excluir aparecem apenas para administradores. Rascunhos não são exibidos para usuários comuns.
- **Pontos seguros no mapa:** os documentos da coleção `abrigos` com latitude/longitude são exibidos no mapa. O balão do ponto oferece rota a pé pelo Google Maps, usando a localização atual como origem quando disponível.
- **Pontos seguros e permissões:** o cadastro/edição/exclusão de abrigos continua restrito a administradores na interface, e as regras de `firestore.rules` restringem gravações no servidor.

### Configuração local

1. Copie `.env.example` para `.env` e configure seus tokens do Mapbox. Não publique o `.env`.
2. Execute `npm install` e depois `npx expo start`.
3. Para ver pontos seguros no mapa, cadastre documentos na coleção `abrigos` com `nome`, `situacao`, `endereco`, `latitude` e `longitude`. Use coordenadas reais e confirme a situação dos locais com fontes oficiais.
4. A rota é aberta no Google Maps; ela não é garantia de segurança. Siga alertas e instruções das autoridades locais.

**Segurança:** o ZIP não inclui o arquivo `.env`, caches do Expo, dependências instaladas nem o histórico `.git`. Configure os tokens no seu ambiente local.
