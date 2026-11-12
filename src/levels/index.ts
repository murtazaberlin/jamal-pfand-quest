import { LevelDef } from './types';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD3 } from './world3';
import { WORLD4 } from './world4';

/** Alle Stages in Spielreihenfolge: je Welt 2 Level + Bossarena. */
export const STAGES: LevelDef[] = [...WORLD1, ...WORLD2, ...WORLD3, ...WORLD4];

export const WORLD_NAMES = ['DESIERTO', 'MERCADO', 'LA MINA', 'PIRÁMIDE & VOLCÁN'];

export function stageLabel(i: number): string {
  return STAGES[i]?.id.replace('B', 'BOSS') ?? '';
}
