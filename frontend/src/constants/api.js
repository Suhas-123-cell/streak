import Config from 'react-native-config';

export const API_URL = Config.API_URL || 'http://localhost:8000/api';

export const endpoints = {
  signup: `${API_URL}/auth/signup`,
  login: `${API_URL}/auth/login`,
  profile: (id) => `${API_URL}/profile/${id}`,
  battles: `${API_URL}/battles`,
  userBattles: (id) => `${API_URL}/battles/user/${id}`,
  battle: (id) => `${API_URL}/battles/${id}`,
  invite: (id) => `${API_URL}/battles/${id}/invite`,
  accept: (id) => `${API_URL}/battles/${id}/accept`,
  decline: (id) => `${API_URL}/battles/${id}/decline`,
  leave: (id) => `${API_URL}/battles/${id}/leave`,
  members: (id) => `${API_URL}/battles/${id}/members`,
  checkins: `${API_URL}/checkins`,
  battleCheckins: (id) => `${API_URL}/checkins/${id}`,
  todayCheckins: (id) => `${API_URL}/checkins/${id}/today`,
  penalties: `${API_URL}/penalties`,
  battlePenalties: (id) => `${API_URL}/penalties/${id}`,
  penaltyDone: (id) => `${API_URL}/penalties/${id}/done`,
  globalLeaderboard: `${API_URL}/leaderboard/global`,
  battleLeaderboard: (id) => `${API_URL}/leaderboard/${id}`,
  pushToken: `${API_URL}/push-token`,
};
