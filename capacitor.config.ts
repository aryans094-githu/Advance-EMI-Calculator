import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clearloan.emicalculator',
  appName: 'ClearLoan EMI Calculator',
  webDir: 'artifacts/emi-calculator/dist/public',
  android: {
    allowMixedContent: false,
  },
};

export default config;
