# Zona de Risco

Aplicativo Expo/React Native para mapear e compartilhar alertas de riscos naturais.

## Perfis do sistema

- **Visitante:** consulta o mapa e recebe alertas próximos enquanto usa o aplicativo.
- **Usuário cadastrado:** consulta alertas, mantém o perfil e cadastra/altera a residência.
- **Administrador:** acessa o painel administrativo, publica ocorrências e visualiza a lista completa.

O administrador inicial é `alinelasneau@gmail.com`. Para adicionar colegas, inclua os e-mails em `services/accessControl.js` e também na função `ehAdministrador` de `firestore.rules`.

Somente riscos naturais são cadastrados: alagamento, enchente, deslizamento, vendaval, seca e incêndio florestal.

## Como executar no Windows

### Requisitos

- Node.js 20 LTS instalado;
- aplicativo Expo Go atualizado no celular;
- computador e celular conectados à mesma rede Wi-Fi.

### Passo a passo

Abra o terminal **dentro desta pasta**, a mesma que contém o arquivo `package.json`, e execute:

```bash
npm install
npx expo start --clear
```

Quando o QR Code aparecer, abra o Expo Go no celular e leia o código.

Se a rede da faculdade ou do computador bloquear a conexão, encerre com `Ctrl+C` e tente:

```bash
npx expo start --tunnel --clear
```

## Verificações do projeto

```bash
npm run lint
npx expo-doctor
```

## Configuração obrigatória do Firebase

No Firebase Console, abra o projeto usado em `services/firebaseConfig.js`:

1. Em **Authentication > Método de login**, ative E-mail/Senha.
2. Em **Firestore Database > Regras**, copie o conteúdo de `firestore.rules` e publique.
3. Em **Storage > Regras**, copie o conteúdo de `storage.rules` e publique.
4. Crie a conta `alinelasneau@gmail.com` pelo próprio aplicativo ou pelo painel Authentication.

Sem publicar essas regras, o Firebase exibirá `Missing or insufficient permissions`.

## Localização e notificações

O aplicativo atualiza a localização aproximadamente a cada 60 segundos ou após deslocamento de 50 metros, enquanto está aberto. Um alerta natural em um raio de até 5 km gera uma notificação local uma vez. Monitoramento contínuo com o aplicativo totalmente fechado exige uma development build própria e permissões de localização em segundo plano.

## Observações importantes

- Não execute os comandos dentro de uma pasta `area-de-risco` antiga ou duplicada.
- Não é necessário enviar nem copiar a pasta `node_modules`.
- O mapa usa um componente nativo. Para testar o aplicativo, prefira Android/iPhone com Expo Go em vez do navegador.
- O login, o armazenamento e os alertas dependem do projeto Firebase configurado em `services/firebaseConfig.js`.
