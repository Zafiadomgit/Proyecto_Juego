# Cumplimiento de políticas de Google Play

Checklist para publicar sin rechazos ni suspensiones. **Revisa siempre la versión vigente** en el
[Centro de políticas para desarrolladores](https://play.google.com/about/developer-content-policy/):
las políticas cambian y esto no es asesoría legal.

## Pagos (Política de pagos)
- [x] Todos los bienes digitales (gemas, sin anuncios, temas) se venden con **Google Play Billing**
      (`src/platform/billing.ts`). No se enlaza a pagos externos.
- [ ] En producción: **verificar en servidor** el token de compra (Google Play Developer API) antes de otorgar nada.
- [ ] **Reconocer (acknowledge)** cada compra en menos de 3 días o Google la reembolsa automáticamente.
- [ ] **Consumir** los consumibles (gemas) después de otorgarlos.
- [x] Botón **"Restaurar compras"** para los no consumibles.
- [x] Las compras no consumibles son idempotentes (`applyPurchase`).
- [x] Se muestra el precio localizado que devuelve Play antes de comprar.

## Cajas de botín / objetos aleatorios
- [x] **No hay** objetos aleatorios de pago. Si en el futuro se añaden, hay que **mostrar las probabilidades
      antes de la compra** (política de monetización de Play) y revisar las leyes locales (p. ej. Bélgica, Países Bajos).

## Anuncios (Política de anuncios)
- [x] Nunca durante la partida ni de forma inesperada: solo en pausas naturales (`afterGame`).
- [x] Los anuncios recompensados son **opcionales**, y la recompensa se explica antes de verlos.
- [x] Se puede cerrar el anuncio recompensado (sin recompensa).
- [ ] Usar **AdMob** con la plataforma **UMP** para el consentimiento (RGPD/EEE, Reino Unido, estados de EE. UU.).
- [ ] No cargar anuncios en la pantalla de inicio al abrir la app.
- [ ] Crear `app-ads.txt` en el dominio del desarrollador.

## Público objetivo y familias
- Recomendación: declarar **público objetivo 13+** en la primera versión. Si se incluyen menores de 13 años,
  se aplica el **Programa para familias**: solo SDK de anuncios autorizados para familias, sin anuncios
  personalizados y requisitos extra de privacidad.
- El contenido es apto para todos: hay que completar el cuestionario **IARC** (previsiblemente PEGI 3 / Everyone).
  Ojo: tener compras in-app se indica aparte en la ficha.

## Privacidad y datos
- [ ] Publicar una **política de privacidad** (URL en la ficha y dentro de la app, Ajustes → Política de privacidad).
- [ ] Rellenar la sección **Seguridad de los datos** en Play Console (AdMob recoge el ID de publicidad,
      diagnósticos, etc.).
- [ ] Declarar el uso del **ID de publicidad** (permiso `AD_ID`).
- [x] La partida guardada es local; no se recogen datos personales propios.
- [ ] Si se añaden cuentas en la nube: ofrecer **eliminar la cuenta** desde la app y desde la web.

## Ficha de la tienda
- [ ] No usar nombres, iconos ni capturas que imiten a otros juegos (p. ej. no usar "Blast" en el nombre).
- [ ] Capturas reales del juego; nada de "anuncios engañosos" (también es una queja frecuente en las reseñas).
- [ ] Sin afirmaciones no verificables ("nº1", "el más descargado").

## Técnico
- [ ] Target API level: el exigido por Play en el momento de publicar (actualmente Android 15 / API 35 o superior).
- [ ] Android App Bundle (`.aab`) firmado con Play App Signing.
- [ ] Prueba interna → cerrada (las cuentas personales nuevas necesitan **12+ testers durante 14 días**) → producción.
