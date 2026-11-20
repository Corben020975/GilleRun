import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.arena51.app',
  appName: 'Arena 51',
  webDir: 'dist',
  backgroundColor: '#07080a',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#07080a',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07080a',
    },
  },
}

export default config
