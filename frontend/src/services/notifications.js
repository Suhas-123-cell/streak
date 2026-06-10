import messaging from '@react-native-firebase/messaging';

export async function requestPermissionAndGetToken() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (!enabled) return null;
  const token = await messaging().getToken();
  return token;
}

export function onTokenRefresh(callback) {
  return messaging().onTokenRefresh(callback);
}
