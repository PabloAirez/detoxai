import { Tabs } from 'expo-router';
import { Pressable, Alert, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function TabsLayout() {
  const { logout, loading: isLoggingOut } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const insets = useSafeAreaInsets();


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
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#070707',
          borderBottomWidth: 1,
          borderBottomColor: '#1f1f1f',
        },
         tabBarStyle: {
          backgroundColor: '#070707',
          borderTopColor: '#1f1f1f',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        headerTintColor: '#f7f7f7',
        headerTitleStyle: {
          fontWeight: '900',
        },
        sceneStyle: {
          backgroundColor: '#070707',
        },
  
        tabBarActiveTintColor: '#ff4d00',
        tabBarInactiveTintColor: '#8c8c8c',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'DASHBOARD',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
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
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarLabel: 'INSIGHTS',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="brain" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: 'Limites',
          tabBarLabel: 'LIMITES',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="timer-off" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
