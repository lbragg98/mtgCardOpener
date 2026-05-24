const BATTLE_SETTINGS_KEY = 'binderBattleSettings';

export const DEFAULT_BATTLE_SETTINGS = {
  animationSpeed: 'normal',
  autoEndTurn: false,
  difficulty: 'normal',
  showHelpTips: true,
  showOfficialText: true,
};

export const ANIMATION_SPEED_MULTIPLIER = {
  fast: 0.65,
  normal: 1,
  slow: 1.45,
};

export function getAnimationSpeedMultiplier(speed = 'normal') {
  return ANIMATION_SPEED_MULTIPLIER[speed] || ANIMATION_SPEED_MULTIPLIER.normal;
}

export function getBattleSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(BATTLE_SETTINGS_KEY) || '{}');

    return {
      ...DEFAULT_BATTLE_SETTINGS,
      ...savedSettings,
    };
  } catch {
    return DEFAULT_BATTLE_SETTINGS;
  }
}

export function saveBattleSettings(settings) {
  const nextSettings = {
    ...DEFAULT_BATTLE_SETTINGS,
    ...(settings || {}),
  };

  localStorage.setItem(BATTLE_SETTINGS_KEY, JSON.stringify(nextSettings));
  window.dispatchEvent(new Event('battleSettingsUpdated'));

  return nextSettings;
}
