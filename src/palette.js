// Single source of truth for the First Date season-poster palette.
// Import these everywhere; never hardcode player colors elsewhere.

// Player -> color. Tuned for the dark ground (see mocks/gen-palette.mjs).
export const PLAYER_COLORS = {
  Cory: '#ff4d6d',
  Teresa: '#ff9e45',
  Jesa: '#ffd23f',
  Brendan: '#9be564',
  Sean: '#2ec4b6',
  Brooke: '#4cc9f0',
  Mindy: '#4361ee',
  Taylor: '#9b5de5',
  Lisa: '#f15bb5',
  Zach: '#e0a458',
  Jay: '#c45baa',
};

// Canonical player order (same order as players.json).
export const PLAYER_ORDER = [
  'Cory',
  'Teresa',
  'Jesa',
  'Brendan',
  'Sean',
  'Brooke',
  'Mindy',
  'Taylor',
  'Lisa',
  'Zach',
  'Jay',
];

// Background / ink tokens used in the mocks.
export const INK_TOKENS = {
  bg: '#0f1020',
  ink: '#f5f3ee',
  muted: '#8a88a0',
};

// Serif display stack for titles.
export const SERIF = "'Georgia', 'Times New Roman', serif";
