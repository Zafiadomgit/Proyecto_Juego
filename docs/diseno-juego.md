# Gemzy Blocks — Documento de diseño (GDD)

## Concepto
Puzzle de bloques 8×8: arrastra piezas al tablero, completa filas o columnas para despejarlas y encadena
rachas. La partida termina cuando ninguna pieza de la bandeja cabe. Es gratis, sin energía y sin conexión.

## Bucle principal (30 segundos)
1. Recibes 3 piezas.
2. Las colocas. Cada línea completada se despeja y te da puntos (más puntos si despejas varias líneas a la vez).
3. Si despejas en jugadas seguidas, ganas una **racha** que multiplica los puntos (tolera 2 jugadas sin despejar).
4. Si dejas el tablero vacío, ganas un bonus de +300.

**Sensación de juego:** bloques con relieve, vista previa de las líneas que se van a despejar, partículas,
temblor de pantalla proporcional a la jugada, textos ("¡Genial!", "¡Racha x3!"), sonidos sintetizados que
suben de tono con la racha y vibración.

**Justicia:** la bandeja intenta que las 3 piezas quepan; como mínimo garantiza una. Las piezas no colocables
se muestran en gris. Con el tablero lleno salen más piezas pequeñas.

## Modos
| Modo | Descripción | Para qué sirve |
|------|-------------|----------------|
| Clásico | Partida infinita, se juega por el récord | Bucle principal y anuncios recompensados |
| Aventura | Niveles con gemas incrustadas; se gana recogiendo todas. 1–3 estrellas según la eficiencia | Progresión, sensación de avance (hybrid-casual) |
| Reto diario | Misma semilla para todos los jugadores ese día | Hábito diario; base para futuras clasificaciones |

## Capa meta
- **Monedas** (se ganan jugando): al terminar cada partida o nivel. Sirven para comprar temas.
- **Gemas** (premium, también se regalan): revivir, martillos y temas premium.
- **Temas cosméticos**: Clásico, Neón, Océano, Dulce, Galaxia y Oro Real (exclusivo del pack de inicio).
- **Martillo**: rompe 1 bloque normal (no gemas). Se obtiene con el regalo diario, un anuncio o gemas.
- **Regalo diario**: calendario de 7 días. **Saltarse un día no reinicia el progreso** (sin presión FOMO).

## Monetización (ver `cumplimiento-play-store.md`)
| Fuente | Detalle |
|--------|---------|
| Anuncio recompensado (opcional) | Revivir 1 vez por partida, duplicar monedas, martillo gratis |
| Intersticial (limitado) | Solo entre partidas, nunca en las 3 primeras partidas, máx. 1 cada 3 partidas y 3 min |
| Sin anuncios | 2,99 US$ — compra única |
| Pack de inicio | 4,99 US$ — 300 gemas + tema Oro Real + sin anuncios |
| Gemas | 0,99 / 4,99 / 9,99 US$ (100 / 550 / 1200) |

Precios de referencia; los locales los fija Play Console (precios adaptados a cada país, muy importante en Latinoamérica).

## KPIs objetivo (benchmarks hybrid-casual)
- Retención D1 ≥ 40 %, D7 ≥ 15 %, D30 ≥ 6 %.
- Sesión media ≥ 8 min; ≥ 3 sesiones/día.
- Conversión a pago 1,5–3 %; ARPDAU 0,05–0,12 US$ (mezcla de anuncios + compras).
- Valoración en Play Store ≥ 4,5.

## Ajuste de dificultad
`tests/` incluye un generador determinista de niveles. Con un bot "codicioso" muy simple (con 1 revivir)
se superan ~7 de los 10 primeros niveles y ~55 % de los 40 primeros. Con datos reales hay que ajustar
`rowsToFill` y `gemTarget` en `src/core/levels.ts`, apuntando a que un 85–90 % de jugadores supere los niveles 1–10.

## v0.3 — Impacto, retención y monetización

### Bucle de "una partida más"
Partida → **XP** (nivel del jugador) → **misiones diarias** → **Pase Gemzy** → recompensas → partida.
La pantalla de resultados enseña todo el progreso ganado (barra de XP animada, subida de nivel,
misiones completadas, nivel del pase) para que siempre haya un objetivo a una partida de distancia.

| Sistema | Detalle |
|---|---|
| Giros | 3 por partida, +1 al despejar 2+ líneas a la vez (máx. 5). Con giros ilimitados un bot sacaba una mediana de 2.104 puntos (máx. 11.928) frente a 738 con el límite: sin límite desaparece la tensión. |
| Fiebre | Racha ≥ 3: marco dorado con chispas, rótulo "¡Fiebre!" y barra de racha en el HUD. |
| Efectos | Haces de luz por línea, ondas expansivas, partículas con brillo, rótulos con rebote en cola, marcador que cuenta, polvo al colocar, "¡Nuevo récord!" en plena partida. |
| Nivel del jugador | Curva suave (80 XP + 30 por nivel). Monedas cada nivel; gemas y bomba cada 5. |
| Misiones diarias | 3 al día (fácil/media/difícil), iguales para todos, recompensas fijas visibles. |
| Pase Gemzy (T1) | 30 niveles, 120 XP por nivel. Vía gratis + vía premium (`gemzy_pass_s1`, 4,99 US$) con gemas, bombas y tema exclusivo Aurora. Retroactivo al comprar. Sin cuenta atrás artificial. |
| Potenciadores | Martillo (25 💎), Bomba 3×3 (35 💎, no rompe gemas), Barajar (20 💎). Caja de potenciadores 1,99 US$. |
| Oferta de bienvenida | Pack de inicio tras la 3.ª partida, una sola vez, sin temporizador, sigue en la tienda. |
