import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import {
  generateFailureAnalysis,
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
} from '../services/gemini';
import {
  getTodayUsageStats,
  getWeeklyUsageMinutes,
  AppUsageStat,
} from '../services/usageStats';

const goalMinutes = 240;

interface ShameLogItem {
  id: string;
  day: string;
  time: string;
  message: string;
  color: string;
  isChat?: boolean;
  role?: 'user' | 'assistant';
}

export default function InsightsScreen() {
  const theme = useTheme();
  
  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isBotResponding, setIsBotResponding] = useState(false);
  const [botStatusText, setBotStatusText] = useState('DETOX_BOT V2.1 ONLINE');
  
  // Data states
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const [topApps, setTopApps] = useState<AppUsageStat[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  
  // AI analysis states
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  // Chat input
  const [chatInput, setChatInput] = useState('');
  
  // Combined timeline (Shame logs + active chat)
  const [timelineItems, setTimelineItems] = useState<ShameLogItem[]>([]);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load real usage and AI insights
  async function loadData() {
    try {
      setIsLoadingStats(true);
      
      // Get device usage stats
      const [todayUsage, weeklyUsageMinutes] = await Promise.all([
        getTodayUsageStats(),
        getWeeklyUsageMinutes(),
      ]);

      setTotalMinutesToday(todayUsage.totalMinutes);
      const filteredApps = todayUsage.apps.filter((app) => app.totalMinutes > 0).slice(0, 5);
      setTopApps(filteredApps);
      setWeeklyData(weeklyUsageMinutes.data);

      // Call Gemini for the failures analysis & shame logs
      const analysis = await generateFailureAnalysis(
        todayUsage.totalMinutes,
        goalMinutes,
        filteredApps,
        weeklyUsageMinutes.data
      );

      setAnalysisData(analysis);

      // Initialize timeline with the generated shame logs
      const logs = (analysis.shameLogs || []).map((log: any, idx: number) => ({
        id: `shame-${idx}`,
        day: log.day,
        time: log.time,
        message: log.message,
        color: log.color || (idx === 0 ? '#ff4d00' : idx === 1 ? '#8c8c8c' : '#ffffff'),
        isChat: false,
      }));
      
      // Append any existing chat history if present
      const activeChat = getChatHistory().map((msg, idx) => ({
        id: msg.id,
        day: 'HOJE',
        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: msg.content,
        color: msg.role === 'user' ? '#ffffff' : '#ff4d00',
        isChat: true,
        role: msg.role,
      }));

      setTimelineItems([...logs, ...activeChat]);

    } catch (error) {
      console.error('Falha ao carregar insights:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Format hour labels for the mini bar chart
  const miniChartData = useMemo(() => {
    // Generate a set of bars representing a late-night focus typical of failure analysis
    // Usually peaks between 22h and 00h
    return [
      { hour: '18h', usage: 12, highlight: false },
      { hour: '19h', usage: 16, highlight: false },
      { hour: '20h', usage: 10, highlight: false },
      { hour: '21h', usage: 15, highlight: false },
      { hour: '22h', usage: 22, highlight: false },
      { hour: '23h', usage: 52, highlight: true }, // critical peak
      { hour: '00h', usage: 60, highlight: true }, // critical peak
      { hour: '01h', usage: 25, highlight: false },
    ];
  }, [totalMinutesToday]);

  // Handle chat submission
  async function handleSend() {
    if (!chatInput.trim() || isBotResponding) return;

    const userMessageText = chatInput.trim();
    setChatInput('');
    Keyboard.dismiss();

    const timestamp = Date.now();
    const timeLabel = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message to timeline immediately
    const userItem: ShameLogItem = {
      id: `chat-user-${timestamp}`,
      day: 'HOJE',
      time: timeLabel,
      message: userMessageText,
      color: '#ffffff',
      isChat: true,
      role: 'user',
    };

    setTimelineItems(prev => [...prev, userItem]);
    setIsBotResponding(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // Start Polling effect for bot status animation
    let dotCount = 0;
    const pollingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      const dots = '.'.repeat(dotCount);
      setBotStatusText(`DETOX_BOT V2.1 ONLINE (DIGITANDO${dots})`);
    }, 400);

    try {
      // Build brief context for Gemini (recent app stats)
      const context = {
        totalMinutesToday,
        topApps: topApps.map(a => `${a.name}: ${a.totalMinutes}m`),
      };

      // Call Gemini API
      const reply = await sendChatMessage(userMessageText, context);
      
      // Stop polling and restore status
      clearInterval(pollingInterval);
      setBotStatusText('DETOX_BOT V1 ONLINE');

      // Add assistant response to timeline
      const assistantItem: ShameLogItem = {
        id: reply.message.id,
        day: 'HOJE',
        time: new Date(reply.message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: reply.message.content,
        color: '#ff4d00',
        isChat: true,
        role: 'assistant',
      };

      setTimelineItems(prev => [...prev, assistantItem]);
    } catch (err) {
      clearInterval(pollingInterval);
      setBotStatusText('DETOX_BOT V1 ERRO');
      
      const errorItem: ShameLogItem = {
        id: `chat-error-${Date.now()}`,
        day: 'HOJE',
        time: timeLabel,
        message: 'Falhei em responder. Talvez você devesse me dar folga... ou apenas configurar minha API key.',
        color: '#ff2d2d',
        isChat: true,
        role: 'assistant',
      };
      
      setTimelineItems(prev => [...prev, errorItem]);
    } finally {
      setIsBotResponding(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  // Get dynamic dopamine rate values
  const dopamineRate = useMemo(() => {
    if (analysisData?.dopamineRate) {
      return analysisData.dopamineRate;
    }
    // Static fallback calculations matching mock data
    const ratio = totalMinutesToday / goalMinutes;
    const percentage = Math.min(Math.round(ratio * 100), 100);
    return {
      percentage,
      title: percentage >= 100 ? 'DOPAMINA BARATA' : 'DOPAMINA CONTROLADA',
      quote: percentage >= 100 ? 'PARABÉNS, VOCÊ VICIOU SEU CÉREBRO EM LIXO.' : 'Ainda está sob controle. Um milagre.',
    };
  }, [analysisData, totalMinutesToday]);

  // Get critical alert warning
  const criticalAlert = useMemo(() => {
    if (analysisData?.criticalAlert) {
      return analysisData.criticalAlert;
    }
    return {
      title: 'VÁ DORMIR, FRACASSADO.',
      timeRange: '23:00 - 01:00',
      description: 'Sua produtividade amanhã já foi sacrificada por 2 horas de scrolling infinito.',
    };
  }, [analysisData]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={styles.keyboardContainer}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingStats}
            onRefresh={loadData}
            tintColor="#ff4d00"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            ANÁLISE DE FALHAS
          </Text>
          <Text variant="bodySmall" style={styles.version}>
            V2.4_STABLE
          </Text>
        </View>

        {/* Alerta Crítico Card */}
        <Card mode="contained" style={[styles.card, styles.alertCard]}>
          <Card.Content>
            <View style={styles.alertHeader}>
              <View style={styles.alertHeaderLeft}>
                <MaterialCommunityIcons name="weather-night" size={18} color="#ff4d00" />
                <Text style={styles.alertLabel}>ALERTA CRÍTICO</Text>
              </View>
              <Text style={styles.alertTime}>{criticalAlert.timeRange}</Text>
            </View>

            <Text variant="titleMedium" style={styles.alertTitle}>
              {criticalAlert.title}
            </Text>
            <Text variant="bodyMedium" style={styles.alertDesc}>
              {criticalAlert.description}
            </Text>

            {/* Custom Bar Chart inside Alerta Card */}
            <View style={styles.chartContainer}>
              <View style={styles.barsRow}>
                {miniChartData.map((item, index) => (
                  <View key={index} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: item.usage,
                            backgroundColor: item.highlight ? '#ff4d00' : '#2a2a2a',
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        item.highlight && styles.barLabelHighlight,
                      ]}
                    >
                      {item.hour}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
        
        {/* Logs de Vergonha Section */}
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          LOGS DE VERGONHA
        </Text>

        {/* Vertical Timeline */}
        <View style={styles.timelineContainer}>
          {timelineItems.map((item, index) => {
            const isLast = index === timelineItems.length - 1;
            return (
              <View key={item.id} style={styles.timelineRow}>
                {/* Left timeline graphics */}
                <View style={styles.timelineGraphic}>
                  <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
                  {!isLast ? (
                    <View style={[styles.timelineLine, { backgroundColor: '#2a2a2a' }]} />
                  ) : null}
                </View>

                {/* Right content card */}
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineHeader, { color: item.color }]}>
                    {item.day} // {item.time}
                  </Text>
                  <Card mode="contained" style={[
                    styles.timelineCard,
                    item.role === 'user' && styles.userTimelineCard
                  ]}>
                    <Card.Content style={styles.timelineCardContent}>
                      <Text style={styles.timelineText}>
                        {item.role === 'user' ? `"${item.message}"` : `"${item.message}"`}
                      </Text>
                    </Card.Content>
                  </Card>
                </View>
              </View>
            );
          })}
        </View>

        {/* Chat / Justificativa Card */}
        <Card mode="contained" style={styles.chatCard}>
          <Card.Content style={styles.chatCardContent}>
            <View style={styles.chatStatusHeader}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: isBotResponding ? '#ff9f1c' : '#73d13d' }]} />
              <Text style={styles.chatStatusText}>
                {botStatusText}
              </Text>
            </View>

            <View style={styles.inputRow}>
              <RNTextInput
                style={styles.textInput}
                placeholder="TENTE JUSTIFICAR SEU VÍCIO..."
                placeholderTextColor="#555"
                value={chatInput}
                onChangeText={setChatInput}
                editable={!isBotResponding}
                onSubmitEditing={handleSend}
              />
              <View
                style={[
                  styles.sendButton,
                  (!chatInput.trim() || isBotResponding) && styles.sendButtonDisabled,
                ]}
                onTouchEnd={handleSend}
              >
                <Text style={styles.sendButtonText}>ENVIAR</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#070707',
  },
  screen: {
    flex: 1,
    backgroundColor: '#070707',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  title: {
    color: '#f7f7f7',
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  version: {
    color: '#8c8c8c',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  alertCard: {
    borderColor: '#ff4d00',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertLabel: {
    color: '#ff4d00',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  alertTime: {
    color: '#8c8c8c',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  alertTitle: {
    color: '#f7f7f7',
    fontWeight: '900',
    marginBottom: 8,
  },
  alertDesc: {
    color: '#9c9c9c',
    lineHeight: 18,
    marginBottom: 16,
  },
  chartContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 16,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 70,
    width: 22,
    backgroundColor: '#111',
    borderRadius: 2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 1,
  },
  barLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  barLabelHighlight: {
    color: '#ff4d00',
  },
  dopamineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dopamineLabel: {
    color: '#9c9c9c',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  dopamineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  dopamineValue: {
    color: '#f7f7f7',
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  dopamineTitle: {
    color: '#ff9f1c',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  dopamineProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#222',
    marginBottom: 12,
  },
  dopamineQuote: {
    color: '#8c8c8c',
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#f7f7f7',
    fontWeight: '900',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timelineContainer: {
    paddingLeft: 4,
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 110,
  },
  timelineGraphic: {
    alignItems: 'center',
    width: 24,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 6,
    marginBottom: -6,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineHeader: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timelineCard: {
    backgroundColor: '#111315',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e2226',
  },
  userTimelineCard: {
    backgroundColor: '#1b1b1b',
    borderColor: '#333333',
  },
  timelineCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  timelineText: {
    color: '#e0e0e0',
    lineHeight: 20,
    fontWeight: '700',
  },
  chatCard: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginTop: 8,
  },
  chatCardContent: {
    padding: 12,
  },
  chatStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  statusIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chatStatusText: {
    color: '#8c8c8c',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#070707',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textInput: {
    flex: 1,
    color: '#f7f7f7',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#e2f1e7',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2e3a33',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#070707',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});
