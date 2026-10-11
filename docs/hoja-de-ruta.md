# Hoja de ruta

## ✅ Fase 1 — Prototipo jugable (este commit)
- Núcleo del juego: tablero 8×8, 35 piezas, líneas, rachas, tablero limpio y bandeja justa.
- Modos clásico, aventura (niveles procedurales con gemas) y reto diario.
- Economía: monedas, gemas, temas, martillo y regalo diario.
- Tienda con catálogo de Play Billing y anuncios **simulados** detrás de interfaces.
- Tests unitarios de la lógica, la economía y la política de anuncios.

## Fase 2 — Android y monetización real (2–3 semanas)
1. Empaquetar con **Capacitor**: `npm i @capacitor/core @capacitor/cli @capacitor/android && npx cap init && npx cap add android`.
2. `PlayBilling` que implemente `BillingService` (plugin, p. ej. `cordova-plugin-purchase` o RevenueCat),
   con validación en servidor (Cloud Function / Supabase Edge Function + Google Play Developer API).
3. `AdMobAds` que implemente `AdsService` (`@capacitor-community/admob`), con UMP para el consentimiento.
4. Analítica (Firebase Analytics): embudo del tutorial, partidas, revivir, compras y retención.
5. Remote Config para ajustar la dificultad y la frecuencia de anuncios sin publicar actualizaciones.
6. Tutorial interactivo de 3 pasos en la primera partida.
7. Icono, capturas y vídeo para la ficha. Política de privacidad publicada.

## Fase 3 — Retención (live ops)
- **Pase de temporada** (4,99 US$/mes, con una vía gratuita con recompensas reales).
- Clasificaciones del reto diario (Play Games Services).
- Eventos semanales temáticos con temas exclusivos ganables jugando.
- Más mecánicas de aventura: bloques de hielo (2 golpes), objetivos de color, niveles de jefe.
- Notificaciones locales opt-in ("tu regalo diario está listo").
- Localización: inglés y portugués (Brasil) como prioridad.
