export const RANKS = ['ROOKIE', 'FIGHTER', 'CHAMPION', 'LEGEND', 'GRANDMASTER'];
export const RANK_THRESHOLDS = [0, 7, 30, 50, 100];
export const RANK_COLOR = {
  ROOKIE:      '#ffffff',
  FIGHTER:     '#00E5FF',
  CHAMPION:    '#B8FF00',
  LEGEND:      '#FFE000',
  GRANDMASTER: '#FF0070',
};
export const RANK_COMBO = {
  ROOKIE: 1, FIGHTER: 3, CHAMPION: 6, LEGEND: 9, GRANDMASTER: 12,
};

export function rankFromStreak(streak) {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (streak >= RANK_THRESHOLDS[i]) return RANKS[i];
  }
  return 'ROOKIE';
}
