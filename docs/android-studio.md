# Compilar Gemzy Blocks con Android Studio

Guía paso a paso para generar el APK de prueba (para tu móvil) y el AAB firmado (para Google Play).
Tiempo: ~30 min la primera vez (casi todo son descargas).

## 1. Instalar las herramientas (una sola vez)
| Programa | Dónde | Notas |
|---|---|---|
| **Node.js 22 LTS** | nodejs.org | Durante la instalación deja marcada la opción "Add to PATH". |
| **Git** | git-scm.com | Opciones por defecto. |
| **Android Studio** (última versión estable) | developer.android.com/studio | En el asistente elige "Standard". Descarga el SDK y el emulador. |

Comprueba en una terminal (Windows: *PowerShell*; Mac: *Terminal*):
```bash
node -v    # debe mostrar v22.x
git --version
```

## 2. Descargar el proyecto y preparar la parte web
```bash
git clone https://github.com/Zafiadomgit/Proyecto_Juego.git
cd Proyecto_Juego
git checkout ccr-f9c095c2-79dsq8
npm ci
npm run build
npx cap sync android
```
`npm run build` compila el juego y `npx cap sync android` lo copia dentro del proyecto Android.
**Repite estos dos comandos cada vez que haya cambios en el juego** (después de `git pull`).

## 3. Abrir en Android Studio
```bash
npx cap open android
```
Si no encuentra Android Studio: ábrelo a mano → *Open* → selecciona la carpeta `Proyecto_Juego/android`.

La primera vez Android Studio hace un **Gradle Sync** (barra inferior) que tarda varios minutos.
Si aparece un aviso para instalar algo (*Android SDK 36*, *build tools*, aceptar licencias), pulsa **Install / Accept**.
Espera a que la barra inferior quede en reposo y no haya errores en rojo.

## 4. Probar en tu móvil
1. En el móvil: *Ajustes → Información del teléfono* → toca 7 veces **Número de compilación** (activa las opciones de desarrollador).
2. *Ajustes → Sistema → Opciones de desarrollador* → activa **Depuración USB**.
3. Conecta el móvil por USB y acepta el aviso "¿Permitir depuración USB?".
4. En Android Studio, arriba, elige tu móvil en la lista de dispositivos y pulsa **Run ▶**.

Qué es normal en esta prueba:
- Los **anuncios** son de prueba de Google (pone "Test Ad").
- La **tienda** dice "no disponible": las compras solo funcionan cuando la app se instala desde Google Play
  (pista de prueba interna). No es un fallo.

## 5. Crear la clave de subida y el AAB firmado
1. *Build → Generate Signed App Bundle or APK…* → **Android App Bundle** → *Next*.
2. *Key store path* → **Create new…**
   - Ruta: una carpeta tuya **fuera del proyecto**, p. ej. `Documentos/claves/gemzy-upload.jks`.
   - Contraseña del almacén y de la clave: fuertes; **apúntalas en un gestor de contraseñas**.
   - Alias: `upload` · Validez: `25` años o más · Nombre y país en el certificado.
3. *Next* → variante **release** → *Create*.
4. Al terminar, el aviso "locate" te lleva al archivo: `android/app/release/app-release.aab`.

Guarda el `.jks` y las contraseñas con copia de seguridad. **Nunca los subas a GitHub.**
Con Play App Signing, si se pierde se puede restablecer desde Play Console, pero tarda días.

## 6. Subirlo a Google Play
1. Play Console → *Crear app* → nombre **Gemzy Blocks**, idioma español, **Juego**, **Gratis**.
2. *Probar y publicar → Prueba interna → Crear versión* → acepta **Play App Signing** → sube `app-release.aab`.
3. Añade tu Gmail como tester, guarda y publica la versión de prueba interna.
4. Abre el enlace de testers en tu móvil, instala desde Play y ya podrás probar compras con
   *Configuración → Pruebas de licencias* (ver `publicar-android.md`, paso 5).

## Siguientes versiones
Cada AAB que subas a Play necesita un **versionCode** mayor que el anterior. Está en
`android/app/build.gradle` (`VERSION_CODE`, por defecto `1`). Antes de generar el siguiente AAB,
súbelo a `2`, `3`… (o pídeme que lo haga).

## Problemas frecuentes
| Error | Solución |
|---|---|
| `npm` no se reconoce | Reinstala Node.js con "Add to PATH" y abre una terminal nueva. |
| `SDK location not found` | Abre la carpeta `android` desde Android Studio (crea `local.properties` solo). |
| `Unsupported class file major version` / JDK | *Settings → Build Tools → Gradle → Gradle JDK* → elige **jbr-21** (el que trae Android Studio). |
| El móvil no aparece | Cambia el modo USB a "Transferencia de archivos" y acepta la depuración USB. |
| Pantalla en blanco al abrir la app | Te faltó `npm run build` + `npx cap sync android` antes de Run. |
