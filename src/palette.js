// Single source of truth for the First Date season-poster palette.
// Import these everywhere; never hardcode player colors elsewhere.

// Two candidate palettes, both tuned for the dark ground. Toggle between them
// live in the app (see the palette switch in App.jsx) to compare in context.
export const PALETTES = {
  // Original vivid set (jewel-toned, leans rainbow).
  Vivid: {
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
  },
  // Curated non-rainbow set (option A): warm + blue + bridging hues, pure hues
  // avoided, varied saturation/lightness, greens lean yellow/teal.
  Curated: {
    Cory: '#e8605d',
    Teresa: '#e8894a',
    Jesa: '#e8c24a',
    Brendan: '#a8c05a',
    Sean: '#4cab93',
    Brooke: '#4a9cc9',
    Mindy: '#5566b8',
    Taylor: '#8f6bb0',
    Lisa: '#c96a9c',
    Zach: '#b5774e',
    Jay: '#7f8ba0',
  },
  // Sunset: a deliberately WARM family (gold -> amber -> coral -> rust ->
  // plum/mauve), distinguished mostly by lightness/saturation rather than
  // sweeping the hue wheel. Cool slate + stone only for the two quietest
  // rotating players, so the set reads as a dusk palette, not a rainbow.
  // Hues are NOT in spectral order around the players.
  Sunset: {
    Cory: '#d6453f', // deep coral red
    Teresa: '#e07a3c', // amber orange
    Jesa: '#e4b24a', // gold
    Brendan: '#c98a3e', // ochre / bronze-gold
    Sean: '#a85d4e', // terracotta / rust
    Brooke: '#d98a7a', // dusty salmon (light)
    Mindy: '#9c4f63', // plum-wine
    Taylor: '#c06b8a', // mauve-rose
    Lisa: '#e49ab0', // dusty pink (light)
    Zach: '#7d6f8c', // muted slate-violet (the quiet one)
    Jay: '#8a8172', // warm stone/taupe (the quiet one)
  },
  // Cool: a teal -> blue -> indigo -> slate family, with a couple of warm
  // accents (coral, amber) reserved for two regulars so they pop out of the
  // cool field. Distinguished by lightness/saturation; not spectral order.
  Cool: {
    Cory: '#e0685f', // coral accent (a regular, pops)
    Teresa: '#e6a95c', // amber accent (a regular, pops)
    Jesa: '#7fcdb8', // bright mint-teal (light, pops)
    Brendan: '#2f7d74', // deep pine-teal (dark)
    Sean: '#4a93c4', // clear ocean blue (mid, bright)
    Brooke: '#9fd0e0', // pale sky (very light, separates from Sean)
    Mindy: '#3b4a8f', // deep indigo (dark, saturated)
    Taylor: '#7d79d0', // vivid periwinkle (light, saturated)
    Lisa: '#b3a7e0', // soft lilac (lightest violet)
    Zach: '#53697d', // steel blue-grey (dim neutral)
    Jay: '#9fb0bd', // pale slate (light neutral)
  },
};

export const PALETTE_NAMES = Object.keys(PALETTES);

// The LIVE palette object every component reads as PLAYER_COLORS[name]. Its
// values are swapped IN PLACE by setPalette() so the toggle updates the whole
// app on the next render (combined with a root key bump in App.jsx).
export const PLAYER_COLORS = { ...PALETTES.Curated };

// Name of the currently active palette (default: the new curated set).
export let ACTIVE_PALETTE = 'Curated';

// Swap the live PLAYER_COLORS values to the named palette, in place.
export function setPalette(name) {
  const next = PALETTES[name];
  if (!next) return;
  ACTIVE_PALETTE = name;
  Object.assign(PLAYER_COLORS, next);
}

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
