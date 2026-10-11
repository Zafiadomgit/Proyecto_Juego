/**
 * Catálogo de productos de Google Play Billing. Los IDs deben coincidir con los creados en Play Console.
 * Reglas de diseño (ver docs/cumplimiento-play-store.md):
 *  - Sin cajas de botín / recompensas aleatorias de pago.
 *  - Lo que compras es exactamente lo que se describe.
 *  - Nada imprescindible para avanzar: todo se puede conseguir jugando, salvo cosméticos exclusivos.
 */
export type ProductType = 'consumable' | 'non_consumable';

export interface ProductDef {
  id: string;
  type: ProductType;
  title: string;
  description: string;
  /** Precio de referencia en USD; el precio real localizado lo da Google Play. */
  referencePriceUsd: number;
  grants: { gems?: number; removeAds?: boolean; themes?: string[] };
  highlight?: string;
}

export const PRODUCTS: readonly ProductDef[] = [
  {
    id: 'remove_ads',
    type: 'non_consumable',
    title: 'Sin anuncios',
    description: 'Elimina para siempre los anuncios entre partidas. Los anuncios con recompensa siguen siendo opcionales.',
    referencePriceUsd: 2.99,
    grants: { removeAds: true },
    highlight: 'Recomendado',
  },
  {
    id: 'starter_pack',
    type: 'non_consumable',
    title: 'Pack de inicio',
    description: '300 gemas + tema exclusivo "Oro Real" + sin anuncios. Compra única.',
    referencePriceUsd: 4.99,
    grants: { gems: 300, removeAds: true, themes: ['gold'] },
    highlight: 'Mejor valor',
  },
  {
    id: 'gems_100',
    type: 'consumable',
    title: 'Bolsa de gemas',
    description: '100 gemas.',
    referencePriceUsd: 0.99,
    grants: { gems: 100 },
  },
  {
    id: 'gems_550',
    type: 'consumable',
    title: 'Cofre de gemas',
    description: '550 gemas (10% extra).',
    referencePriceUsd: 4.99,
    grants: { gems: 550 },
  },
  {
    id: 'gems_1200',
    type: 'consumable',
    title: 'Tesoro de gemas',
    description: '1200 gemas (20% extra).',
    referencePriceUsd: 9.99,
    grants: { gems: 1200 },
  },
];

export function productById(id: string): ProductDef | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Precios en gemas de los usos de la moneda premium. */
export const GEM_COSTS = {
  revive: 40,
  hammer: 25,
} as const;
