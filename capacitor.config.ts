import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️ El ID de la app es PERMANENTE una vez subida a Play Console. Cámbialo antes de la primera subida si quieres otro.
  appId: 'com.zafiadom.gemzyblocks',
  appName: 'Gemzy Blocks',
  webDir: 'dist',
  android: {
    backgroundColor: '#140c3f',
  },
};

export default config;
