import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();

/** Vibración: Haptics nativo en Android (más fino que navigator.vibrate) y Vibration API en web. */
export function haptic(enabled: boolean, pattern: number | number[]): void {
  if (!enabled) return;
  if (native) {
    const strong = Array.isArray(pattern) || pattern >= 30;
    void Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => undefined);
  } else if ('vibrate' in navigator) navigator.vibrate(pattern);
}

/**
 * Integración con Android: botón atrás y guardado al pasar a segundo plano.
 * `onBack` devuelve true si gestionó el gesto; si no, se minimiza la app (comportamiento estándar).
 */
export function initNative(hooks: { onBack: () => boolean; onPause: () => void }): void {
  if (!native) return;
  void App.addListener('backButton', () => {
    if (!hooks.onBack()) void App.minimizeApp();
  });
  void App.addListener('pause', () => hooks.onPause());
}
