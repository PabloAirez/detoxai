import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getSession, deleteSession} from '../../lib/auth';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function TabsLayout() {
  const router = useRouter();

  useEffect(() => {
    getSession()
      .then((session) => {
        if (!session) {
          router.replace('/');
        }
      })
      .catch(() => router.replace('/'));
  }, [router]);

  const handleLogout = async () => {
      deleteSession();
      router.replace('/'); // Redirect to login screen after logout
    };

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          headerRight: () => (
            <Pressable 
              onPress={async () => await handleLogout()}
              style={{ marginRight: 16 }}
            >
              <Feather name="log-out" size={24} color="#FF6B6B" />
            </Pressable>
          ),
        }} 
      />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="goals" options={{ title: 'Metas' }} />
    </Tabs>
  );
}
