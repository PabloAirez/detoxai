import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthNavigator />
    </AuthProvider>
  );
}
