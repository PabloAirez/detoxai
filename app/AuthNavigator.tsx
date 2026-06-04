import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';

export function AuthNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d1110' }}>
        <ActivityIndicator size="large" color="#2cff12" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // App Stack - Usuário autenticado
        <Stack.Screen
          name="(tabs)"
          options={{
            animationEnabled: false,
          }}
        />
      ) : (
        // Auth Stack - Usuário não autenticado
        <>
          <Stack.Screen name="index" />
          <Stack.Screen name="register" />
        </>
      )}
    </Stack>
  );
}
