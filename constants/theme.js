import { Platform } from 'react-native';

// Tokens de cor por tema
export const Colors = {
  light: {
    // usados pela tela de configurações e pelos componentes Themed*
    background: '#d9e6ef',   // azul claro
    text: '#000',
    card: '#777',            // caixas cinzas
    primary: '#000',         // botões pretos
    avatar: '#e6b8a2',       // cor do perfil
    icon: '#000',

    // Fundos
    screen: '#f5f7fb',           // fundo de tela acinzentado
    surface: '#fff',             // telas brancas, cartões, modais
    surfaceSubtle: '#f8f9fa',
    surfaceMuted: '#f1f3f4',     // campos, chips, caixas neutras
    header: '#fff',
    tabBar: '#fff',
    overlay: 'rgba(0,0,0,0.4)',  // fundo escurecido atrás de modais

    // Textos
    textStrong: '#202124',       // títulos e texto principal
    textSecondary: '#3c4043',
    textMuted: '#5f6368',
    textFaint: '#80868b',
    placeholder: '#9aa0a6',

    // Bordas
    border: '#dadce0',
    borderSoft: '#e1e5ea',

    // Destaque (azul) — tint é para texto/ícone; button é fundo de botão com texto branco
    tint: '#1a73e8',
    tintBackground: '#e8f0fe',
    tintBorder: '#d2e3fc',
    tintSoft: '#eef6ff',
    button: '#1a73e8',
    onButton: '#fff',

    // Estados — *Button são fundos sólidos com texto branco e não mudam no escuro
    danger: '#d93025',
    dangerStrong: '#c5221f',
    dangerBackground: '#fce8e6',
    dangerButton: '#d93025',
    success: '#137333',
    successBackground: '#e6f4ea',
    successButton: '#188038',
    warning: '#8a3b00',
    warningBackground: '#fff4e5',
  },

  dark: {
    background: '#000',      // fundo preto
    text: '#fff',
    card: '#333',
    primary: '#fff',
    avatar: '#1e90ff',
    icon: '#e8eaed',

    screen: '#121212',
    surface: '#1e1f22',
    surfaceSubtle: '#18191b',
    surfaceMuted: '#2a2b2e',
    header: '#1e1f22',
    tabBar: '#1e1f22',
    overlay: 'rgba(0,0,0,0.6)',

    textStrong: '#e8eaed',
    textSecondary: '#dadce0',
    textMuted: '#bdc1c6',
    textFaint: '#9aa0a6',
    placeholder: '#80868b',

    border: '#3c4043',
    borderSoft: '#34363a',

    tint: '#8ab4f8',
    tintBackground: '#1a2b45',
    tintBorder: '#2b4a75',
    tintSoft: '#172235',
    button: '#1a73e8',
    onButton: '#fff',

    danger: '#f28b82',
    dangerStrong: '#f28b82',
    dangerBackground: '#3a1d1b',
    dangerButton: '#d93025',
    success: '#81c995',
    successBackground: '#1b3a26',
    successButton: '#188038',
    warning: '#fdd663',
    warningBackground: '#3a2a12',
  },
};


export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});