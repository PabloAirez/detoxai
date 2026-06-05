export type NativeUsageStat = {
  packageName: string;
  appName: string;
  totalTimeMillis: number;
  firstTimeStamp: number;
  lastTimeStamp: number;
  lastTimeUsed: number;
  icon?: string;
};

export type DetoxUsageStatsModule = {
  hasUsageAccess(): Promise<boolean>;
  requestUsageAccess(): Promise<boolean>;
  getUsageStats(startTime: number, endTime: number): Promise<NativeUsageStat[]>;
};
