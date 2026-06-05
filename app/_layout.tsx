import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { AuthProvider } from '../src/contexts/AuthContext';
import { GeminiProvider } from '../src/contexts/GeminiContext';
import { AuthNavigator } from './AuthNavigator';

const detoxTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#070707',
    surface: '#161616',
    surfaceVariant: '#1d1d1d',
    primary: '#ff4d00',
    secondary: '#ffd166',
    tertiary: '#ff9f1c',
    error: '#ff2d2d',
    onBackground: '#f7f7f7',
    onSurface: '#f7f7f7',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={detoxTheme}>
      <AuthProvider>
        <GeminiProvider>
          <AuthNavigator />
        </GeminiProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
