export const STUDIO = {
  backdrop: "#07041a",
  fog: "#140a36",
  fogDensity: 0.022,

  violet: "#8f5cff",
  purple: "#b25cff",
  blue: "#4c6bff",
  gold: "#ffbf47",
  goldDeep: "#e8962a",
  coral: "#ff6f4a",
  cream: "#fff2d6",

  screenTop: "#3a1f8f",
  screenBottom: "#0d0730",
} as const;

type Surface = {
  color?: string;
  roughness?: number;
  metalness?: number;
  led?: string;
  ledIntensity?: number;
  envMapIntensity?: number;
  emissive?: string;
  emissiveIntensity?: number;
};

export const STUDIO_SURFACES: [RegExp, Surface][] = [
  [/^MAT_Arena_LED_Cyan$/, { led: STUDIO.blue, ledIntensity: 1.6 }],
  [/^MAT_Arena_LED_Amber$/, { led: STUDIO.coral, ledIntensity: 1.8 }],
  [/^MAT_Audience_LED_Amber$/, { led: STUDIO.coral, ledIntensity: 1.2 }],
  [/^MAT_Audience_LED_Cyan$/, { led: STUDIO.violet, ledIntensity: 1.2 }],
  [/^MAT_ArenaFloor_LED_Cyan$/, { led: STUDIO.violet, ledIntensity: 1.4 }],
  [/^MAT_ArenaFloor_LED_Amber$/, { led: STUDIO.gold, ledIntensity: 1.6 }],
  [/LED_Ring_Blue$/, { led: STUDIO.violet, ledIntensity: 1.8 }],
  [/LED_Ring_Gold$/, { led: STUDIO.gold, ledIntensity: 2 }],
  [/LED_Stairs$/, { led: STUDIO.gold, ledIntensity: 1.6 }],
  [/^MAT_Rig_LED_Amber$/, { led: STUDIO.gold, ledIntensity: 1.4 }],
  [/^MAT_Rig_LED_Cyan$/, { led: STUDIO.violet, ledIntensity: 1.2 }],
  [/^HostPodium_LED/, { led: STUDIO.gold, ledIntensity: 1.8 }],
  [/Mic_LED_Red$/, { led: "#ff3b5c", ledIntensity: 1 }],

  [/^MAT_ArenaFloor_Navy$/, { color: "#120a2e", roughness: 0.2, metalness: 0.45, envMapIntensity: 1 }],
  [/^MAT_ArenaFloor_Black$/, { color: "#0e0826", roughness: 0.3, metalness: 0.3 }],
  [/^MAT_ArenaFloor_Gold$/, { color: STUDIO.gold, roughness: 0.3, metalness: 0.85, emissive: "#7a4a10", emissiveIntensity: 0.5 }],
  [/^MAT_ArenaFloor_Metal$/, { color: "#5a4a9a", roughness: 0.35, metalness: 0.8 }],

  [/^StagePlatform_Top_Surface$/, { color: "#0f0830", roughness: 0.16, metalness: 0.55, envMapIntensity: 1.1 }],
  [/^StagePlatform_Body_NavyMetal$/, { color: "#3a2492", roughness: 0.4, metalness: 0.35 }],
  [/^StagePlatform_Tread_Charcoal$/, { color: "#21134f", roughness: 0.45 }],
  [/^StagePlatform_Channel_Dark$/, { color: "#120a30", roughness: 0.5 }],

  [/^ContestantPodium_Body_NavyMetal$/, { color: "#4a35c4", roughness: 0.32, metalness: 0.25 }],
  [/^ContestantPodium_Panel_Charcoal$/, { color: "#6d3fd6", roughness: 0.35, metalness: 0.2 }],
  [/^ContestantPodium_Top_MatteCharcoal$/, { color: "#2a1a6e", roughness: 0.4 }],
  [/^ContestantPodium_Screen_BlackGlass$/, { color: "#0a0620", roughness: 0.1, metalness: 0.5 }],
  [/^HostPodium_Body_NavyMetal$/, { color: "#5b2fc0", roughness: 0.3, metalness: 0.25 }],
  [/^HostPodium_Panel_Charcoal$/, { color: "#3b2496", roughness: 0.35 }],
  [/^HostPodium_Top_MatteCharcoal$/, { color: "#24155e", roughness: 0.4 }],

  [/^MAT_Arena_Wall_Navy$/, { color: "#24165a", roughness: 0.55, metalness: 0.2 }],
  [/^MAT_Arena_Wall_Black$/, { color: "#120a30", roughness: 0.6 }],
  [/^MAT_Audience_Seat_Dark$/, { color: "#2a1858", roughness: 0.7 }],
  [/^MAT_Audience_Metal_Navy$/, { color: "#2a1a66", roughness: 0.5, metalness: 0.4 }],
  [/^MAT_Audience_Metal_Black$/, { color: "#120a2c", roughness: 0.5, metalness: 0.4 }],
  [/^MAT_Rig_Metal_Navy$/, { color: "#1d1440", roughness: 0.5, metalness: 0.6 }],
  [/^MAT_Spotlight_Lens$/, { color: STUDIO.cream, led: "#ffd58a", ledIntensity: 1.6 }],

  [/Gold$/, { color: STUDIO.gold, roughness: 0.3, metalness: 0.85, emissive: "#7a4a10", emissiveIntensity: 0.55 }],
  [/Navy(Metal)?$/, { color: "#2a1a6e", roughness: 0.45, metalness: 0.35 }],
];

export const STUDIO_STATUS_COLORS = {
  idle: "#3d6bff",
  thinking: "#3d6bff",
  answered: "#ff9a2e",
  correct: "#2ff07a",
  wrong: "#ff3b4f",
  missed: "#5d4f86",
} as const;

export const STUDIO_PODIUM_BASE_LED = STUDIO.gold;
