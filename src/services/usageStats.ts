import { Platform } from 'react-native';
import DetoxUsageStats, {
  NativeUsageStat,
} from '../../modules/detox-usage-stats';

export type AppUsageStat = {
  packageName: string;
  name: string;
  icon?: string;
  totalMinutes: number;
  lastTimeUsed: number;
};

export type UsageStatsResult = {
  supported: boolean;
  permissionGranted: boolean;
  totalMinutes: number;
  apps: AppUsageStat[];
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date.getTime();
}

function normalizeUsageStat(stat: NativeUsageStat): AppUsageStat {
  return {
    packageName: stat.packageName,
    name: stat.appName || stat.packageName,
    icon: stat.icon,
    totalMinutes: Math.round(stat.totalTimeMillis / 60000),
    lastTimeUsed: stat.lastTimeUsed,
  };
}

export async function requestUsageStatsPermission() {
  if (Platform.OS !== 'android') {
    return false;
  }

  return DetoxUsageStats.requestUsageAccess();
}

export async function getTodayUsageStats(): Promise<UsageStatsResult> {
  return getUsageStatsForRange(startOfToday(), Date.now());
}

export async function getUsageStatsForRange(
  startTime: number,
  endTime: number
): Promise<UsageStatsResult> {
  if (Platform.OS !== 'android') {
    return {
      supported: false,
      permissionGranted: false,
      totalMinutes: 0,
      apps: [],
    };
  }

  const permissionGranted = await DetoxUsageStats.hasUsageAccess();

  if (!permissionGranted) {
    return {
      supported: true,
      permissionGranted: false,
      totalMinutes: 0,
      apps: [],
    };
  }

  const rawStats = await DetoxUsageStats.getUsageStats(startTime, endTime);
  const apps = rawStats
    .map(normalizeUsageStat)
    .sort((left, right) => right.totalMinutes - left.totalMinutes);

  return {
    supported: true,
    permissionGranted,
    totalMinutes: apps.reduce((total, app) => total + app.totalMinutes, 0),
    apps,
  };
}

export async function getWeeklyUsageMinutes() {
  const labels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const dailyTotals = await Promise.all(
    labels.map((_, index) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + index);
      start.setHours(0, 0, 0, 0);

      if (start.getTime() > Date.now()) {
        return Promise.resolve({
          supported: Platform.OS === 'android',
          permissionGranted: false,
          totalMinutes: 0,
          apps: [],
        });
      }

      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const endTime = Math.min(end.getTime(), Date.now());

      return getUsageStatsForRange(start.getTime(), endTime);
    })
  );

  return {
    labels,
    data: dailyTotals.map((day) => day.totalMinutes),
  };
}
