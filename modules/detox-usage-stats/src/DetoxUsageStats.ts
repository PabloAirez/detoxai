import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { DetoxUsageStatsModule } from './DetoxUsageStats.types';

const unsupportedModule: DetoxUsageStatsModule = {
  async hasUsageAccess() {
    return false;
  },
  async requestUsageAccess() {
    return false;
  },
  async getUsageStats() {
    return [];
  },
};

export default Platform.OS === 'android'
  ? requireNativeModule<DetoxUsageStatsModule>('DetoxUsageStats')
  : unsupportedModule;
