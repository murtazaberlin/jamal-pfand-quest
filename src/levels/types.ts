/**
 * Level-Format: ASCII-Zeilen (eine Zeichenkette pro Kachelreihe).
 *
 * Legende
 *  .  leer                         X  Boden (Autotile)
 *  H  harter Block                 #  Ziegel
 *  ?  Piñata mit Flasche           *  Piñata mit Power-up (Taco bzw. Chili)
 *  K  Piñata mit Goldenem Kaktus   M  Piñata mit Lucha-Maske (1-Up)
 *  i  unsichtbare Piñata (Maske)   $  Ziegel mit 8 Flaschen
 *  =  Einweg-Plattform             ^  Stacheln       L  Lava
 *  [ ]  Brunnen oben (betretbar)   { }  Brunnen-Schaft
 *  |  Säule (Deko)                 r  Schiene (Deko)  w  Rückwand (Deko)
 *  B  Pfandflasche                 @  Start
 *  C  Checkpoint (Agave-Fahne)     G  Ziel-Kaktus (unten an der Basis)
 *  g  ZYROO   p  Panzer-ZYROO   f  Flieger-ZYROO   t  Wurf-ZYROO   s  Stachel-ZYROO
 *  -  bewegliche Plattform horizontal   v  bewegliche Plattform vertikal
 *  ~  Fallplattform                     c  Lore (horizontal, Welt 3)
 *  Ziffer direkt rechts von - v c: Bewegungsweite in Kacheln (Standard 3)
 *  Q  Boss-Startposition
 */
export interface BonusRoom {
  rows: string[];
  /** Spalte im Hauptlevel, an der Jamal nach dem Bonusraum wieder auftaucht (Brunnen). */
  returnCol: number;
}

export interface LevelDef {
  id: string;
  name: string;
  world: number; // 0..3
  music: string;
  time: number;
  rows: string[];
  bonus?: BonusRoom;
  boss?: number; // 0..3 → Boss-Arena
  noBackscroll?: boolean;
  dark?: boolean;
  hint?: string[]; // Tutorial-Hinweise: "spalte:text"
}

export const enum TK {
  Empty = 0,
  Ground,
  Hard,
  Brick,
  Pinata,
  Used,
  OneWay,
  WellTL,
  WellTR,
  WellBL,
  WellBR,
  Spikes,
  Lava,
  Hidden,
  BackWall,
  Rail,
  Pillar,
}

export type BlockContent = 'bottle' | 'power' | 'star' | 'mask' | 'multi' | 'none';

export interface EntitySpawn {
  type: string;
  tx: number;
  ty: number;
  range: number;
}
