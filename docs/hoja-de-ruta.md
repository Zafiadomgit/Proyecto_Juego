# Hoja de ruta

## ✅ Fase 1 — Prototipo jugable (este commit)
- Núcleo del juego: tablero 8×8, 35 piezas, líneas, rachas, tablero limpio y bandeja justa.
- Modos clásico, aventura (niveles procedurales con gemas) y reto diario.
- Economía: monedas, gemas, temas, martillo y regalo diario.
- Tienda con catálogo de Play Billing y anuncios **simulados** detrás de interfaces.
- Tests unitarios de la lógica, la economía y la política de anuncios.

## ✅ Phase 2: Android and real monetization (code done)
- Android project with Capacitor 8 (targetSdk 36), its own icon, back button, native haptics.
- Google Play Billing 9 (cordova-plugin-purchase): token-based delivery with no duplicates, pending payments, restore.
- Server-side verification: `supabase/functions/verify-purchase` (Play Developer API).
- AdMob + UMP consent and privacy options.
- GitHub Actions workflow that builds the debug APK and signed AAB.
- **Pending (on your side):** steps in [publicar-android.md](publicar-android.md).

## Phase 2b: before production
1. Analytics (Firebase Analytics): tutorial funnel, games played, revives, purchases and retention.
2. Remote Config to tune difficulty and ad frequency without shipping updates.
3. A 3-step interactive tutorial in the first game.
4. Feature graphic and screenshots for the listing.

## Fase 3 — Retención (live ops)
- **Pase de temporada** (4,99 US$/mes, con una vía gratuita con recompensas reales).
- Clasificaciones del reto diario (Play Games Services).
- Eventos semanales temáticos con temas exclusivos ganables jugando.
- Más mecánicas de aventura: bloques de hielo (2 golpes), objetivos de color, niveles de jefe.
- Notificaciones locales opt-in ("tu regalo diario está listo").
- Localización: inglés y portugués (Brasil) como prioridad.
