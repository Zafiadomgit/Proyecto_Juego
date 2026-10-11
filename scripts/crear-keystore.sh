#!/usr/bin/env bash
# Crea la "clave de subida" (upload key) para firmar el AAB que se sube a Google Play.
# Ejecútalo EN TU ORDENADOR (necesita Java/keytool). Guarda el .jks y las contraseñas en un lugar seguro
# (gestor de contraseñas + copia de seguridad). Con Play App Signing, si la pierdes se puede restablecer
# desde Play Console, pero tarda días.
set -euo pipefail
OUT="${1:-joya-bloques-upload.jks}"
ALIAS="${2:-upload}"
if [ -e "$OUT" ]; then echo "Ya existe $OUT; no lo sobrescribo." >&2; exit 1; fi
keytool -genkeypair -v -keystore "$OUT" -alias "$ALIAS" -keyalg RSA -keysize 4096 -validity 10000
echo
echo "Listo. Ahora en GitHub → Settings → Secrets and variables → Actions → New repository secret:"
echo "  ANDROID_KEYSTORE_BASE64  = (contenido de: base64 -w0 $OUT   | en macOS: base64 -i $OUT)"
echo "  ANDROID_KEYSTORE_PASSWORD = la contraseña del almacén"
echo "  ANDROID_KEY_ALIAS         = $ALIAS"
echo "  ANDROID_KEY_PASSWORD      = la contraseña de la clave (normalmente la misma)"
