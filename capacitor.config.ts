import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vivekpandey.tenantrentmanager',
  appName: 'RentBook',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
