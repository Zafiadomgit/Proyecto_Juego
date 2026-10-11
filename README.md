# Joya Bloques 💎

Un puzzle de bloques gratuito para Android, **diseñado a partir de lo que los jugadores dicen en las reseñas de
Google Play**: el género más descargado (puzzle de bloques), con capa meta hybrid-casual y una monetización
que evita las quejas más comunes (exceso de anuncios, no poder quitarlos, energía, pay-to-win y cajas de botín).

## Probar
```bash
npm install
npm run dev        # http://localhost:5173 (en el móvil: misma red, usa la IP del PC)
npm test           # tests de lógica, economía y política de anuncios
npm run build      # build de producción en dist/
npx cap sync android && npx cap open android   # abrir en Android Studio
```

En el navegador las compras y los anuncios son simulados; en Android se usan Google Play Billing y AdMob.
Para publicar, sigue [docs/publicar-android.md](docs/publicar-android.md).

## Estructura
```
src/core/       Lógica pura (tablero, piezas, puntuación, niveles, partida) — testeada
src/meta/       Economía, temas, catálogo de compras, guardado
src/platform/   Billing y Ads: simulados en web; Play Billing (playBilling.ts) y AdMob (admobAds.ts) en Android
android/        Proyecto nativo (Capacitor)
supabase/       Función de servidor que verifica las compras con Google
src/ui/         Render en canvas, arrastrar y soltar, efectos, sonido sintetizado
docs/           Investigación de mercado, GDD, cumplimiento Play Store, hoja de ruta
```

## Documentación
- [Investigación de mercado](docs/investigacion-mercado.md)
- [Diseño del juego](docs/diseno-juego.md)
- [Cumplimiento de políticas de Google Play](docs/cumplimiento-play-store.md)
- [Publicar en Google Play (paso a paso)](docs/publicar-android.md)
- [Hoja de ruta](docs/hoja-de-ruta.md)
