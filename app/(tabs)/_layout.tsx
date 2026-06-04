import { Tabs } from 'expo-router';
import { Pressable, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useState } from 'react';

export default function TabsLayout() {
  const { logout, loading: isLoggingOut } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    try {
      setIsProcessing(true);
      Alert.alert('Confirmar Logout', 'Deseja sair da aplicação?', [
        {
          text: 'Cancelar',
          onPress: () => setIsProcessing(false),
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao fazer logout');
              setIsProcessing(false);
            }
          },
          style: 'destructive',
        },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Algo deu errado');
      setIsProcessing(false);
    }
  };

  const isLoading = isLoggingOut || isProcessing;

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              disabled={isLoading}
              style={{ marginRight: 16, opacity: isLoading ? 0.5 : 1 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <Feather name="log-out" size={24} color="#FF6B6B" />
              )}
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="goals" options={{ title: 'Metas' }} />
    </Tabs>
  );
}
