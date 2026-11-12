/**
 * Pixel-Art als Zeichen-Bitmaps (eigene Entwürfe). Jede Zeile muss exakt die
 * Spritebreite haben – das prüft ein Unit-Test.
 * Alle Figuren schauen nach rechts; Spiegelung macht Phaser (flipX).
 */

// ---------------- JAMAL ----------------
export const J_HAT_S = [
  '......kkkk......',
  '.....kYYYok.....',
  '.....kYYYYk.....',
  '....krgrgrgk....',
  '..kkYYYYYYYYkk..',
  '.kyYYYYYYYYYYyk.',
];
export const J_FACE_S = [
  '..kkkkkkkkkkkk..',
  '....kdsswkssk...',
  '....kdsssssssk..',
  '....kdmmmmmmmk..',
];
export const J_BODY_S = [
  '...kRmRRRRRRmk..',
  '..kRGWGWGWGWGRk.',
  '..kRRRRRRRRRRRk.',
  '...kWkWkWkWkWk..',
];

export const J_HAT_B = [
  '......kkkk......',
  '.....kYYYok.....',
  '....kYYYYYok....',
  '....kYYYYYYk....',
  '...krgrgrgrgk...',
  '..kkYYYYYYYYYkk.',
  '.kYYYYYYYYYYYYYk',
  'kyyyYYYYYYYYyyyk',
];
export const J_FACE_B = [
  '.kkkkkkkkkkkkkk.',
  '....kddddddk....',
  '....kdsswkssk...',
  '....kdsswksssk..',
  '....kdssssssssk.',
  '....kdmmmmmmmmk.',
  '...kdmmmmmmmmmmk',
];
export const J_BODY_B = [
  '....kmmssssmmk..',
  '...kRRRRRRRRRRk.',
  '..kRRGGRRGGRRRk.',
  '..kGWWGWWGWWGGk.',
  '..kRRRRRRRRRRRk.',
  '..kRGRGRGRGRGRk.',
  '..kRRRRRRRRRRRk.',
  '..kGWWGWWGWWGGk.',
  '..kRRRRRRRRRRRk.',
  '...kWkWkWkWkWk..',
];

// ---------------- ZYROO ----------------
export const Z_WALK0 = [
  '....kkkkkk......',
  '...kSsssssk.....',
  '..kSshhhhhhk....',
  '..kSswkswkssk...',
  '..kSsssssnnnk...',
  '..kSssssnnnNNk..',
  '..kSswkwwkwNk...',
  '...kzzzzzzzzk...',
  '..kCzzzxzzzzzk..',
  '..kCczzzzxzzzk..',
  '..kCczxzzzzzzk..',
  '...kczzzzxzzk...',
  '...kcxzzzzzk....',
  '....kzzzxzzk....',
  '....kfkzzzk.....',
  '...kfffk.kfffk..',
];
export const Z_WALK1 = [
  ...Z_WALK0.slice(0, 11),
  '....kczzzzxzzk..',
  '....kcxzzzzzzk..',
  '.....kzzzxzzzk..',
  '....kfk.kzzzk...',
  '..kfffk..kfffk..',
];
export const Z_FLAT = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...kkkkkkkkk....',
  '..khhhhhhhhhk...',
  '.kskkskknnNNkzk.',
  'kzzzzzzzzzzzzzzk',
];
export const POT_BACK = [
  '...kk...',
  '.kkkkkk.',
  'kllpppPk',
  'kpppppPk',
  'kpppppPk',
  'kpppppPk',
  'kPpppPPk',
  '.kkkkkk.',
];
export const POT_SHELL = [
  '................',
  '................',
  '................',
  '................',
  '.......kk.......',
  '...kkkkkkkkkk...',
  '..kllllppppPPk..',
  'kkkpppppppppPkkk',
  'kPkpppppppppPkPk',
  'kkkpppppppppPkkk',
  '..kpppppppppPk..',
  '..kPppppppppPk..',
  '..kPPpppppPPPk..',
  '...kkkkkkkkkk...',
  '................',
  '................',
];
export const POT_SHELL2 = [
  ...POT_SHELL.slice(0, 6),
  '..kppppllllPPk..',
  ...POT_SHELL.slice(7),
];
export const POT_SHELL3 = [
  ...POT_SHELL.slice(0, 6),
  '..kPPppppplllk..',
  ...POT_SHELL.slice(7),
];
export const POT_PEEK = [
  ...POT_SHELL.slice(0, 4),
  '...kwk.kk.kwk...',
  '...kkkkkkkkkk...',
  ...POT_SHELL.slice(6),
];

export const FLY_BLADES = [
  '.xzzzzzzzzzzzzx.',
  '...xzzzzzzzzx...',
  '.....xzzzzx.....',
];

// ---------------- ITEMS ----------------
export const CHILI = [
  '........gg......',
  '.......gGg......',
  '......kkkkk.....',
  '.....kRRRRRk....',
  '....kRrRRRRk....',
  '....kRrRRRRk....',
  '....kRRRRRRk....',
  '.....kRRRRRk....',
  '.....kRRRRRRk...',
  '......kRRRRRk...',
  '......kRRRRRRk..',
  '.......kRRRRRk..',
  '........kRRRk...',
  '.........kRRk...',
  '..........kk....',
  '................',
];
export const GOLD_CACTUS = [
  '.......kkk......',
  '......kYoYk.....',
  '..kk..kYoYk.....',
  '.kYok.kYYYk.kk..',
  '.kYYk.kYYYk.kYok',
  '.kYYk.kYYYkkkYYk',
  '.kYYkkkYYYYYYYYk',
  '.kYYYYYYYYYYYYk.',
  '..kYYYYYYYYkkk..',
  '...kkkkYYYYk....',
  '......kYYYk.....',
  '......kYoYk.....',
  '......kYYYk.....',
  '....kkkkkkkkk...',
  '....kyyyyyyyk...',
  '.....kkkkkkk....',
];
export const LUCHA_MASK = [
  '....kkkkkkkk....',
  '...kRRRRRRRRk...',
  '..kRRYYRRYYRRk..',
  '.kRRYRRYYRRYRRk.',
  '.kRYRRRYYRRRYRk.',
  '.kRkkkRYYRkkkRk.',
  '.kkwwkkYYkkwwkk.',
  '.kRkkkRYYRkkkRk.',
  '.kRRRRRYYRRRRRk.',
  '.kRRRRkYYkRRRRk.',
  '..kRRRkkkkRRRk..',
  '..kRRk.kk.kRRk..',
  '...kRk.kk.kRk...',
  '...kRRkkkkRRk...',
  '....kkRRRRkk....',
  '......kkkk......',
];
export const BANANA_PEEL = [
  '....kk......',
  '...kYYk.....',
  '..kYyYk.kk..',
  '.kYyk.kkYYk.',
  'kYyk..kYyYk.',
  'kYk..kYyk...',
  '.kk..kYk....',
  '......k.....',
];
export const BANANA_PEEL_LYING = [
  '............',
  '............',
  '............',
  '.....kk.....',
  '....kYYk....',
  '.kkkYyyYkkk.',
  'kYYyYkkYyYYk',
  '.kkkk..kkkk.',
];

/** Agave-Fahne (Checkpoint) 16x32 – Fahne separat eingefärbt. */
export const AGAVE_FLAG = [
  '.......kk.......',
  '......kook......',
  '.......kkkkkkkk.',
  '.......kFFFFFFFk',
  '.......kFFaFFFFk',
  '.......kFaaaFFk.',
  '.......kFFaFFFk.',
  '.......kFFFFFk..',
  '.......kkkkkk...',
];
