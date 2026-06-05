import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  Divider,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { generateDashboardFeedback, validateGeminiSetup } from '../services/gemini';
import {
  AppUsageStat,
  getTodayUsageStats,
  getWeeklyUsageMinutes,
  requestUsageStatsPermission,
} from '../services/usageStats';

type DopamineStatus = 'NORMAL' | 'ALERTA' | 'CRÍTICO';

const goalMinutes = 240;

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function getDopamineStatus(minutes: number): {
  status: DopamineStatus;
  progress: number;
  color: string;
} {
  if (minutes >= 480) {
    return { status: 'CRÍTICO', progress: 0.92, color: '#ff2d2d' };
  }

  if (minutes >= 300) {
    return { status: 'ALERTA', progress: 0.66, color: '#ff9f1c' };
  }

  return { status: 'NORMAL', progress: 0.34, color: '#ffd166' };
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isUsageSupported, setIsUsageSupported] = useState(
    Platform.OS === 'android'
  );
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const [topApps, setTopApps] = useState<AppUsageStat[]>([]);
  const [weeklyUsage, setWeeklyUsage] = useState({
    labels: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: () => '#ff4d00',
        strokeWidth: 3,
      },
    ],
  });
  const [aiSubtitle, setAiSubtitle] = useState(
    'Aguardando acesso ao relatório real do aparelho.'
  );
  const [anticoachFeedback, setAnticoachFeedback] = useState(
    'Dê acesso ao uso de apps e eu paro de chutar com tanta confiança.'
  );

  const dopamine = useMemo(
    () => getDopamineStatus(totalMinutesToday),
    [totalMinutesToday]
  );

  const chartWidth = Math.max(width - 40, 280);
  const mostUsedApp = topApps[0];
  const totalUsageLabel = formatMinutes(totalMinutesToday);
  const goalLabel = formatMinutes(goalMinutes);

  useEffect(() => {
    navigation.setOptions({ title: 'Dashboard' });
  }, [navigation]);

  async function loadRealUsage() {
    try {
      setIsLoadingUsage(true);

      const [todayUsage, weeklyUsageMinutes] = await Promise.all([
        getTodayUsageStats(),
        getWeeklyUsageMinutes(),
      ]);

      setIsUsageSupported(todayUsage.supported);
      setIsPermissionGranted(todayUsage.permissionGranted);
      setTotalMinutesToday(todayUsage.totalMinutes);
      setTopApps(todayUsage.apps.filter((app) => app.totalMinutes > 0).slice(0, 5));
      setWeeklyUsage({
        labels: weeklyUsageMinutes.labels,
        datasets: [
          {
            data: weeklyUsageMinutes.data,
            color: () => '#ff4d00',
            strokeWidth: 3,
          },
        ],
      });

      if (!todayUsage.supported) {
        setAiSubtitle('iOS não entrega uso por app instalado para apps comuns.');
        setAnticoachFeedback('A Apple trancou essa gaveta. Reclame com Cupertino.');
        return;
      }

      if (!todayUsage.permissionGranted) {
        setAiSubtitle('Permissão especial pendente no Android.');
        setAnticoachFeedback('Sem permissão, meu sarcasmo fica sem telemetria.');
        return;
      }

      const geminiSetup = validateGeminiSetup();

      if (!geminiSetup.isValid) {
        setAiSubtitle('Uso real carregado. Gemini ainda não configurado.');
        setAnticoachFeedback(geminiSetup.errors[0]);
        return;
      }

      try {
        const appName = todayUsage.apps[0]?.name ?? 'nenhum app relevante';
        const feedback = await generateDashboardFeedback(
          appName,
          formatMinutes(todayUsage.totalMinutes),
          goalLabel,
          dopamine.status
        );

        setAnticoachFeedback(feedback);
        setAiSubtitle('Uso real carregado. Anticoach atualizado.');
      } catch (geminiError) {
        const errorMessage =
          geminiError && typeof geminiError === 'object' && 'message' in geminiError
            ? String(geminiError.message)
            : 'Não consegui falar com o Gemini agora.';

        setAiSubtitle('Uso real carregado. Gemini falhou na resposta.');
        setAnticoachFeedback(errorMessage);
      }
    } catch {
      setAiSubtitle('Não consegui ler o uso real agora.');
      setAnticoachFeedback('A leitura falhou. O celular venceu esta rodada técnica.');
    } finally {
      setIsLoadingUsage(false);
    }
  }

  useEffect(() => {
    loadRealUsage();
  }, [goalLabel]);

  async function handleRequestUsageAccess() {
    await requestUsageStatsPermission();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoadingUsage}
          onRefresh={loadRealUsage}
          tintColor="#ff4d00"
        />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          DETOX.AI // STATUS: PATÉTICO
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {aiSubtitle}
        </Text>
      </View>

      <Card mode="contained" style={[styles.card, styles.heroCard]}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.label}>
            TEMPO DESPERDICADO
          </Text>
          <Text variant="displaySmall" style={styles.usageValue}>
            {totalUsageLabel}
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            Meta do dia: {goalLabel}
          </Text>
        </Card.Content>
      </Card>

      {!isUsageSupported || !isPermissionGranted ? (
        <Card mode="contained" style={[styles.card, styles.permissionCard]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Acesso ao uso real
            </Text>
            <Text variant="bodyMedium" style={styles.permissionText}>
              {isUsageSupported
                ? 'No Android, ative "Usage access" para o DetoxAI ler o tempo real de cada aplicativo.'
                : 'Esta leitura real por aplicativo instalado só é suportada no Android.'}
            </Text>
            {isUsageSupported ? (
              <Button
                mode="contained"
                icon="cellphone-cog"
                onPress={handleRequestUsageAccess}
                style={styles.permissionButton}
                buttonColor="#ff4d00"
                textColor="#070707"
              >
                Abrir permissões
              </Button>
            ) : null}
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Indicador de Dopamina
            </Text>
            <Chip
              compact
              textStyle={[styles.statusText, { color: dopamine.color }]}
              style={styles.statusChip}
            >
              {dopamine.status}
            </Chip>
          </View>
          <ProgressBar
            progress={dopamine.progress}
            color={dopamine.color}
            style={styles.progress}
          />
          <View style={styles.dopamineScale}>
            <Text style={styles.scaleText}>NORMAL</Text>
            <Text style={styles.scaleText}>ALERTA</Text>
            <Text style={styles.scaleText}>CRÍTICO</Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Top 5 Aplicativos
          </Text>
          <View style={styles.appList}>
            {topApps.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                Nenhum uso real encontrado hoje.
              </Text>
            ) : null}
            {topApps.map((app, index) => (
              <View key={app.packageName}>
                <View style={styles.appRow}>
                  <View style={styles.appIdentity}>
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    {app.icon ? (
                      <Image source={{ uri: app.icon }} style={styles.appIcon} />
                    ) : (
                      <MaterialCommunityIcons
                        name="cellphone"
                        size={24}
                        color={index === 0 ? '#ff2d2d' : '#ffd166'}
                      />
                    )}
                    <Text variant="bodyLarge" style={styles.appName}>
                      {app.name}
                    </Text>
                  </View>
                  <Text variant="bodyLarge" style={styles.appTime}>
                    {formatMinutes(app.totalMinutes)}
                  </Text>
                </View>
                {index < topApps.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card mode="contained" style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Uso Semanal
          </Text>
          <LineChart
            data={weeklyUsage}
            width={chartWidth}
            height={220}
            yAxisSuffix="m"
            withInnerLines={false}
            withOuterLines={false}
            fromZero
            bezier
            chartConfig={{
              backgroundGradientFrom: '#161616',
              backgroundGradientTo: '#161616',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 209, 102, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(247, 247, 247, ${opacity})`,
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#ff2d2d',
              },
            }}
            style={styles.chart}
          />
          <Text variant="bodySmall" style={styles.muted}>
            Dados reais lidos do aparelho via UsageStatsManager.
          </Text>
        </Card.Content>
      </Card>

      <Card mode="contained" style={[styles.card, styles.feedbackCard]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Feedback do Anticoach
            </Text>
            <MaterialCommunityIcons
              name="robot-angry-outline"
              size={24}
              color={theme.colors.error}
            />
          </View>
          <Text
            variant="titleLarge"
            style={styles.feedbackText}
          >
            {anticoachFeedback}
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070707',
  },
  content: {
    padding: 20,
    paddingBottom: 128,
    gap: 14,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  title: {
    color: '#f7f7f7',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#ffb703',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  heroCard: {
    borderColor: '#ff2d2d',
    backgroundColor: '#1d0f0f',
  },
  permissionCard: {
    borderColor: '#ff4d00',
    backgroundColor: '#1d1208',
  },
  permissionText: {
    color: '#f7f7f7',
    marginTop: 10,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    marginTop: 14,
  },
  label: {
    color: '#ff9f1c',
    fontWeight: '900',
  },
  usageValue: {
    color: '#f7f7f7',
    fontWeight: '900',
    marginTop: 8,
  },
  muted: {
    color: '#9c9c9c',
    marginTop: 6,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#f7f7f7',
    fontWeight: '900',
  },
  statusChip: {
    backgroundColor: '#0f0f0f',
    borderColor: '#333333',
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '900',
  },
  progress: {
    height: 10,
    borderRadius: 2,
    backgroundColor: '#2a2a2a',
    marginTop: 16,
  },
  dopamineScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  scaleText: {
    color: '#8c8c8c',
    fontSize: 11,
    fontWeight: '800',
  },
  appList: {
    marginTop: 12,
  },
  appRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    gap: 12,
  },
  appIdentity: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  rank: {
    alignItems: 'center',
    backgroundColor: '#241111',
    borderColor: '#ff2d2d',
    borderRadius: 4,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  rankText: {
    color: '#ff9f1c',
    fontSize: 12,
    fontWeight: '900',
  },
  appName: {
    color: '#f7f7f7',
    flexShrink: 1,
    fontWeight: '800',
  },
  appIcon: {
    borderRadius: 4,
    height: 24,
    width: 24,
  },
  appTime: {
    color: '#ffd166',
    fontWeight: '900',
  },
  chart: {
    borderRadius: 8,
    marginLeft: -16,
    marginTop: 10,
  },
  feedbackCard: {
    borderColor: '#ff9f1c',
    minHeight: 0,
    width: '100%',
  },
  feedbackText: {
    color: '#ffd166',
    flexShrink: 1,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 12,
    minHeight: 0,
    width: '100%',
  },
});
