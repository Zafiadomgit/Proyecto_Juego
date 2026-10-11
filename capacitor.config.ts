import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️ El ID de la app es PERMANENTE una vez subida a Play Console. Cámbialo antes de la primera subida si quieres otro.
  appId: 'com.joyabloques.juego',
  appName: 'Joya Bloques',
  webDir: 'dist',
  android: {
    backgroundColor: '#0d1440',
  },
};

export default config;
