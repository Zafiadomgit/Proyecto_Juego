# Investigación de mercado — Google Play (octubre 2026)

> **Limitación:** desde el entorno de desarrollo no se pudo acceder directamente a Google Play
> (bloqueado por la red), así que no se descargaron reseñas en bruto. Los datos vienen de informes públicos
> de analítica (Sensor Tower vía Singular, FoxData, PocketGamer.biz) y de agregadores de reseñas
> (Kimola, Marlvel, Unstar). Las cifras son **estimaciones de terceros**: sirven para orientar decisiones,
> no como datos contables. Antes de invertir en marketing conviene repetir el análisis con
> herramientas como AppMagic, Sensor Tower o `google-play-scraper` desde una red sin restricciones.

## 1. ¿Qué juegos tienen más impacto?

### Descargas (App Store + Google Play, H1 2025 – julio 2026, Sensor Tower vía Singular)
| # | Juego | Género | Descargas |
|---|-------|--------|-----------|
| 1 | **Block Blast!** | Puzzle de bloques (casual) | ~526 M |
| 2 | Roblox | Plataforma / UGC | ~506 M |
| 3 | Garena Free Fire | Battle royale | ~487 M |

En Google Play (agosto 2026, FoxData), **Block Blast!** siguió siendo el nº1 en descargas (~19 M en el mes,
+7,9 %), seguido de **Pizza Ready!** (idle/tycoon hybrid-casual) y Roblox.

### Ingresos (compras in-app)
- Google Play, agosto 2026: **Roblox** y **MONOPOLY GO!** por encima de 40 M$/mes cada uno.
- Mundial (ambas tiendas, acumulado a julio 2026): Last War: Survival (~2,44 B$), Honor of Kings (~2,30 B$),
  Whiteout Survival (~2,24 B$). Son juegos de estrategia 4X con presupuestos de cientos de millones: **no son
  un objetivo realista** para un equipo pequeño.

### Tendencias por género
- **Hybrid-casual** fue la mayor historia de crecimiento de ingresos en H1 2026 (~+23 %, ~2,4 B$):
  mecánica casual sencilla + capa meta/progresión + monetización mixta (anuncios + compras).
- **Hyper-casual** fue el único segmento que creció en descargas en 2025, pero monetiza casi solo con anuncios.
- **Estrategia** es el género que más factura (~9,3 B$), pero exige equipos y presupuestos grandes.

## 2. ¿Qué dicen las reseñas?

### Lo que más gusta (Block Blast! y similares)
- Mecánica **adictiva y relajante**: partidas cortas, ideales para trayectos, para "desconectar".
- **Juego sin conexión**.
- Al principio, **no tenía compras in-app agresivas**, y eso se valoraba mucho.

### Lo que más se critica
1. **Exceso de anuncios**: es la queja nº1 en las reseñas de Block Blast!. Hay anuncios entre partidas y, además,
   banners durante el juego.
2. **No se pueden quitar los anuncios pagando**: hay reseñas que piden literalmente "pagaría por quitar los
   anuncios, pero no puedo".
3. **Monetización agresiva / pay-to-win**: un 34 % de las reseñas negativas de los 50 juegos top de 2026
   (según el análisis de Unstar). Las expresiones típicas son "cash grab", "greedy", sistemas de energía que
   obligan a esperar o pagar, cajas de botín con probabilidades malas y anuncios "cada 30 segundos".
4. **Publicidad engañosa** (anuncios que muestran un juego distinto).
5. **Rendimiento**: sobrecalentamiento, lag y pantallas negras tras ver un anuncio.

## 3. Conclusión y oportunidad

| Hallazgo | Decisión de diseño |
|----------|--------------------|
| El puzzle de bloques es el nº1 en descargas, y es barato de producir | **Género: puzzle de bloques 8×8** |
| Hybrid-casual es lo que más crece en ingresos | Capa meta: **aventura con gemas**, **reto diario**, **temas coleccionables**, **calendario de regalos** |
| La queja nº1 son los anuncios | Intersticiales muy limitados (nunca en partida, periodo de gracia, máx. 1 cada 3 partidas / 3 min) |
| La queja nº2 es no poder quitar los anuncios | **Compra "Sin anuncios"** visible desde el primer día |
| Se odian la energía y el pay-to-win | **Sin energía**, juego ilimitado; lo que se paga son **cosméticos**, comodidad o una segunda oportunidad |
| Se odian las cajas de botín | **Sin cajas de botín**: cada compra dice exactamente lo que da |
| Rendimiento | Canvas 2D ligero (~14 KB gzip), sin motor pesado y sin assets de audio |

**Posicionamiento:** *"El puzzle de bloques que respeta tu tiempo"*. Competimos en el género más descargado
atacando directamente sus quejas más votadas. Ese mensaje sirve para la ficha de Play Store y para
pedir valoraciones.

## Fuentes
- Singular — Top mobile games 2026: https://www.singular.net/blog/top-mobile-games/
- FoxData — Global Mobile Game Rankings August 2026: https://foxdata.com/en/blogs/global-mobile-game-rankings-august-2026-top-15-downloads-revenue/
- FoxData — July 2026: https://foxdata.com/en/blogs/global-mobile-game-rankings-july-2026-top-15-downloads-revenue/
- PocketGamer.biz — March 2026 charts: https://www.pocketgamer.biz/march-2026-mobile-game-charts-brawl-stars-revenue-rises-nearly-50/
- Anahata — Hybrid-casual pulling ahead 2026: https://anahatainteractive.com/blog/hybrid-casual-pulling-ahead-2026
- Global Games Forum — State of Gaming 2026: https://www.globalgamesforum.com/features/state-of-gaming-heres-what-the-mobile-data-actually-says
- Kimola — Block Blast! user feedback (Google Play): https://kimola.com/reports/dive-into-block-blast-user-feedback-analysis-report-google-play-152706
- Marlvel — Block Blast reviews: https://marlvel.ai/apps/block-blast/reviews
- Unstar — What mobile gamers hate most 2026: https://unstar.app/blog/gaming-app-reviews-what-mobile-gamers-hate-most-2026
- Esports.net — How Royal Match makes money: https://www.esports.net/news/mobile-games/how-does-royal-match-make-money/
- Global Games Forum — Monopoly GO! ad monetization: https://www.globalgamesforum.com/news/monopoly-go-a-game-that-wasnt-created-for-ads
