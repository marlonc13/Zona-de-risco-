# Zona de Risco

Aplicativo mobile desenvolvido com **React Native (Expo)** que alerta pessoas próximas de **catástrofes climáticas**, mapeando e compartilhando ocorrências em tempo real. Os dados são armazenados no **Firebase** e o mapa é renderizado com o **Mapbox**.

## Riscos monitorados

- Alagamento
- Enchente
- Deslizamento
- Vendaval
- Incêndio florestal

## Tecnologias

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
- [Mapbox](https://www.mapbox.com/) para mapas
- [Firebase](https://firebase.google.com/): Authentication e Firestore (banco de dados)
- [Open-Meteo](https://open-meteo.com/) para condições meteorológicas (sem chave de API)
- [OpenStreetMap / Nominatim](https://nominatim.org/) para a pesquisa de endereços (abrigos e pessoas acompanhadas)
- [Jest](https://jestjs.io/) com `jest-expo` para os testes automatizados

## Perfis do sistema

- **Visitante:** consulta o mapa, o histórico de alertas e recebe avisos próximos enquanto usa o aplicativo.
- **Usuário cadastrado:** além do que o visitante faz, mantém o perfil, cadastra/altera a residência e acompanha até 5 pessoas ou locais favoritos.
- **Administrador:** acessa o painel administrativo, publica ocorrências, gerencia pontos seguros e visualiza relatórios.

O administrador inicial é `alinelasneau@gmail.com`. Novos administradores podem ser cadastrados pela administradora principal usando o e-mail da conta.

## Funcionalidades

### Alertas e mapa

- Gravidade do alerta: **Atenção**, **Alerta** ou **Emergência**.
- Área afetada configurável: 500 m, 1 km, 3 km ou 5 km, exibida como um círculo colorido no mapa.
- Monitoramento da localização atual e da residência cadastrada.
- Orientações de segurança específicas para cada tipo de risco.
- Tela completa de detalhes de cada ocorrência, com foto, dados, orientação, mapa da área afetada e abertura de rota.
- Selo de alerta oficial com datas de publicação e atualização.
- Condições meteorológicas atuais (Open-Meteo). As informações são apenas auxiliares: nenhuma ocorrência é publicada automaticamente.
- Histórico de alertas público. Rascunhos ficam visíveis somente para administradores.
- Compartilhamento de alertas pelo **WhatsApp**, a partir do mapa ou da tela de detalhes.
- Ao abrir, o mapa já começa na última localização conhecida do usuário (ou mostrando o Brasil, se ainda não houver nenhuma).

### Ciclo de vida das ocorrências

Cada ocorrência passa pelas situações abaixo. Somente as **ativas** e **em monitoramento** aparecem no mapa.

| Situação | O que significa |
|---|---|
| Rascunho | Salva pelo administrador, mas ainda não publicada (não aparece para os usuários) |
| Ativa | Risco confirmado e publicado no mapa |
| Em monitoramento | Continua visível enquanto é acompanhada |
| Controlada | Risco contido e retirado do mapa |
| Encerrada | Atendimento concluído e arquivado |

Alertas ativos ou em monitoramento são **encerrados automaticamente** quando chega a data de expiração definida na publicação.

### Estatísticas públicas

- Aba disponível para todos, sem dados pessoais: totais de ocorrências, alertas ativos, emergências e ocorrências dos últimos 30 dias.
- Mapa de calor histórico e gráficos por período, situação, tipo, gravidade e bairro.

### Pessoas e locais favoritos

- Acompanhamento de até **5 endereços** de pessoas ou locais importantes (visível somente para o próprio usuário).
- Cada endereço recebe uma cor de marcador, e a tela mostra quais alertas ativos atingem cada um.
- Os endereços também entram nos avisos de alertas próximos e no modo de emergência.

### Pontos seguros e abrigos

- Abrigos exibidos no mapa, com rota a pé pelo Google Maps usando a localização atual como origem.
- Categorias: abrigo temporário, ponto seguro e ponto de apoio.
- Fotos, situação, capacidade, recursos e acessibilidade.
- Ordenação por distância.
- Cadastro, edição e exclusão restritos a administradores, com pesquisa de endereços e gravação precisa das coordenadas.

### Modo de emergência

- Ativado por alerta de **Emergência** cuja área alcance a localização do usuário, a residência ou um endereço acompanhado.
- Instruções de evacuação e checklist disponíveis **offline**.
- Ligações rápidas para Defesa Civil (**199**), Bombeiros (**193**) e SAMU (**192**).
- Botão **SOS** no topo do mapa, sempre disponível, com ligação para Bombeiros (**193**), Defesa Civil (**199**) e Polícia (**190**).

### Painel administrativo

- Alertas ativos, encerrados e risco mais frequente.
- Criação, edição, reativação, encerramento e exclusão de ocorrências.
- Histórico com filtros combináveis por período, bairro, tipo de risco e gravidade.
- Mapa de calor baseado no histórico, com filtro por tipo de risco.
- Estatísticas por tipo, gravidade, situação, período e bairro, com relatório exportável em **PDF**.
- Trilha de auditoria: registra qual administrador criou, editou, reativou ou encerrou cada alerta.

### Conta e perfil

- Login com e-mail e senha. Com a **biometria** ativada, o app pede a digital ou o rosto sempre que é aberto com a conta conectada.
- Foto de perfil (câmera ou galeria, ao tocar na foto) e nome salvos no documento `usuarios/{uid}`.
- Em **Configurações**: cadastro da residência, troca de senha (com confirmação da senha atual), ativação da biometria ao abrir o app e exclusão da conta (que também apaga os dados do perfil).
- **Sair da conta** volta para a tela inicial, onde é possível entrar como visitante ou fazer login.

### Aparência e acessibilidade

- Tema **claro**, **escuro** ou **igual ao do sistema**, aplicado a todas as telas e aos mapas.
- Opção **Letras grandes**, que aumenta em 30% o texto de todas as telas.

## Como executar

> ⚠️ O mapa usa o Mapbox, que depende de código nativo. Por isso o projeto **não roda no Expo Go**: é necessário instalar uma **development build** (versão de desenvolvimento) no celular ou emulador.

### Requisitos

- [Node.js](https://nodejs.org/) 20.19 ou mais recente (recomendado: 24 LTS, a mesma versão usada nos testes do GitHub)
- Computador e celular na mesma rede Wi-Fi
- Conta no [Mapbox](https://www.mapbox.com/) para gerar os tokens
- Projeto no [Firebase](https://console.firebase.google.com/)
- Conta gratuita no [Expo](https://expo.dev/signup) (para o build na nuvem) **ou** ambiente Android local (Android Studio + JDK) para o build local

### 1. Configure o projeto

1. Clone o repositório e entre na pasta do projeto (a mesma que contém o `package.json`).
2. Copie o arquivo de variáveis de ambiente e preencha com suas chaves:

   ```bash
   cp .env.example .env
   ```

   > No Windows (PowerShell): `Copy-Item .env.example .env`

   O `.env.example` lista todas as chaves necessárias:

   | Variável | Para que serve |
   |---|---|
   | `EXPO_PUBLIC_MAPBOX_TOKEN` | Token público do Mapbox (`pk.`), usado pelo app para exibir o mapa |
   | `MAPBOX_SECRET_TOKEN` | Token secreto do Mapbox (`sk.`), usado só durante o build para baixar o SDK nativo |

   **Nunca publique o seu `.env`.** Ele já está no `.gitignore`.

3. Instale as dependências:

   ```bash
   npm install
   ```

### 2. Tokens do Mapbox

O Mapbox usa dois tipos de token:

- **Token público** (`pk.`): usado pelo app para exibir o mapa.
- **Token secreto de download** (`sk.`): criado em *Tokens* na sua conta Mapbox com o escopo **`DOWNLOADS:READ`**. Ele é necessário **durante o build** para baixar o SDK nativo do Mapbox.

Configure ambos conforme indicado no `.env.example`. Se o build falhar com erro de download do Mapbox, confira primeiro o token secreto.

### 3. Gere a development build

Esse passo é feito **uma única vez** (e de novo sempre que instalar/atualizar uma biblioteca com código nativo, ou alterar o `app.json`).

#### Opção A: EAS Build, na nuvem (recomendada)

Não exige Android Studio.

```bash
npm install -g eas-cli
eas login
npx expo install expo-dev-client   # se ainda não estiver instalado
eas build --platform android --profile development
```

- O `eas.json` precisa ter um perfil `development` com `"developmentClient": true`.
- Se o token secreto do Mapbox estiver em uma variável de ambiente, cadastre-o também no EAS (`eas env:create` ou pelo painel em expo.dev), pois o build roda nos servidores da Expo e não enxerga o seu `.env` local.
- Ao final, a CLI exibe um QR Code/link: abra no celular Android, baixe o `.apk` e instale (permita a instalação de fontes desconhecidas, se solicitado). O build também fica disponível no painel em [expo.dev](https://expo.dev/).
- Para iPhone, use `--platform ios` (exige conta Apple Developer paga). No simulador iOS, defina `"ios": { "simulator": true }` no perfil `development`.

#### Opção B: build local

Exige o ambiente Android configurado (Android Studio, JDK e `ANDROID_HOME`) e um celular com depuração USB ativada ou um emulador aberto.

```bash
npx expo install expo-dev-client   # se ainda não estiver instalado
npx expo run:android
```

Esse comando gera a pasta `android/`, compila e instala o app no dispositivo. Para iOS (somente macOS com Xcode): `npx expo run:ios`.

### 4. Inicie o projeto

Com a development build instalada, inicie o servidor de desenvolvimento pelo terminal:

```bash
npx expo start --dev-client
```

Abra o app **Zona de Risco** (a development build) no celular e leia o QR Code. A partir daí, alterações no código JavaScript atualizam o app automaticamente, sem precisar gerar um novo build.

Se a rede bloquear a conexão, encerre com `Ctrl+C` e tente:

```bash
npx expo start --dev-client --tunnel
```

Se o Android não encontrar o servidor pelo Wi-Fi, conecte o cabo USB e rode `adb reverse tcp:8081 tcp:8081`.

> No Windows, se o PowerShell bloquear os comandos, use `npm.cmd` e `npx.cmd` no lugar de `npm` e `npx`.

## Configuração do Firebase

No Firebase Console, abra o projeto usado em `services/firebaseConfig.js`:

1. Em **Authentication > Método de login**, ative **E-mail/Senha**.
2. Em **Firestore Database > Regras**, copie o conteúdo de `firestore.rules` e publique.
3. Crie a conta `alinelasneau@gmail.com` pelo próprio aplicativo ou pelo painel Authentication.

Sem publicar as regras, o Firebase exibirá `Missing or insufficient permissions`.

Para adicionar administradores fixos, inclua os e-mails em `services/accessControl.js` e também na função `ehAdministrador` de `firestore.rules`.

### Cadastro de pontos seguros

Para exibir pontos seguros no mapa, cadastre documentos na coleção `abrigos` com os campos `nome`, `situacao`, `endereco`, `latitude` e `longitude`. Use coordenadas reais e confirme a situação dos locais com fontes oficiais.

### Fotos

As fotos (perfil, ocorrências e abrigos) são convertidas para **Base64** por `services/imageUpload.js` e salvas diretamente no Firestore, sem usar o Firebase Storage. O limite por arquivo é de **300 KiB**, para manter o documento abaixo do limite do Firestore. Por isso as fotos são comprimidas ao serem escolhidas ou tiradas.

## Localização e notificações

O aplicativo atualiza a localização a cada ~60 segundos ou após deslocamento de 50 metros, enquanto está aberto. Quando a localização atual ou a residência cadastrada estiver dentro da área de um alerta, o mapa exibe um aviso.

- Um alerta cuja área alcance a localização atual, a residência ou um endereço acompanhado gera uma notificação local, uma única vez por alerta.
- A última localização é guardada no aparelho para o mapa abrir direto no lugar certo na próxima vez.
- Monitoramento com o aplicativo totalmente fechado exige permissão de localização em segundo plano.

## Verificações do projeto

```bash
npm test
npm run test:regras   # regras do Firestore, no emulador (precisa de Java 17 ou mais recente)
npm run lint
npx expo-doctor
```

### Testes automatizados

Os testes ficam em `__tests__/` e cobrem as regras principais do app: ciclo de vida das ocorrências (o que aparece no mapa), controle de administradores, avisos de alertas próximos, orientações de risco e a opção "Letras grandes". Em `__tests__/telas/` ficam os testes das telas mais importantes, feitos com a [Testing Library](https://callstack.github.io/react-native-testing-library/): o modal de nova ocorrência no mapa (gravidade, rascunho e aviso de emergência), o modal "Alterar situação" e o selo de validade em Alertas, e a biometria ao abrir o app. Eles não usam o Firebase real nem precisam de celular.

As **regras do Firestore** (`firestore.rules`) têm testes próprios em `__tests__/regras/`, executados no emulador do Firebase: eles conferem que visitantes e usuários comuns não publicam alertas nem gerenciam abrigos, que cada pessoa só acessa o próprio perfil, que administradores desativados perdem o acesso e que só a administradora principal cadastra administradores. Na primeira execução o emulador é baixado automaticamente.

No GitHub, o workflow **Testes** (`.github/workflows/testes.yml`) roda `npm test` e `npm run test:regras` em todo push e em todo pull request para a `main`. A `main` é protegida: as alterações entram por pull request e o merge só é liberado quando os testes passam.

## Estrutura do projeto

| Pasta | Conteúdo |
|---|---|
| `app/` | Telas e rotas ([Expo Router](https://docs.expo.dev/router/introduction/)); as abas ficam em `app/(tabs)/` |
| `components/` | Componentes reutilizáveis (textos com "Letras grandes", modal deslizante, câmera, etc.) |
| `contexts/` | Estados globais: tema e tamanho das letras |
| `hooks/` | Hooks de tema e estilos (`useTema`, `useEstilos`) |
| `services/` | Regras e integrações: Firebase, ciclo de vida dos alertas, administradores, notificações, clima, endereços |
| `styles/` | Estilos de cada tela, com versões para o tema claro e o escuro |
| `constants/` | Cores dos temas |
| `__tests__/` | Testes automatizados |

## Como contribuir

1. Crie uma branch a partir da `main` (ex.: `feat/nome-da-melhoria` ou `fix/nome-do-problema`).
2. Faça as alterações e rode `npm test` e `npm run lint` antes de enviar.
3. Envie a branch e abra um **pull request** para a `main`.
4. O merge é liberado depois que o check **Testes automatizados** passar e o pull request for aprovado.

## Observações importantes

- Não é necessário enviar nem copiar a pasta `node_modules`.
- O login e os alertas dependem do projeto Firebase configurado em `services/firebaseConfig.js`.
- O arquivo `.env`, os caches do Expo, as dependências instaladas e o histórico `.git` não devem ser compartilhados.
- As rotas são abertas no Google Maps e **não são garantia de segurança**. Siga sempre os alertas e as instruções das autoridades locais.