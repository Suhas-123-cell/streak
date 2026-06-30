import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {Text, Animated, Easing, StatusBar, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {C} from './src/constants/theme';
import {endpoints} from './src/constants/api';
import {requestPermissionAndGetToken, onTokenRefresh} from './src/services/notifications';

import HomeScreen from './src/screens/HomeScreen';
import BattleDetailScreen from './src/screens/BattleDetailScreen';
import NewBattleScreen from './src/screens/NewBattleScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';
import UsernameSetupScreen from './src/screens/UsernameSetupScreen';
import PaywallScreen from './src/screens/PaywallScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Arcade boot splash ─────────────────────────────────────────────
function SplashScreen({onDone}) {
  const op       = useRef(new Animated.Value(0)).current;
  const screenOp = useRef(new Animated.Value(1)).current;
  const blink    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(op, {toValue: 1, duration: 180, useNativeDriver: true}),
      Animated.loop(
        Animated.sequence([
          Animated.timing(blink, {toValue: 0, duration: 120, useNativeDriver: true}),
          Animated.timing(blink, {toValue: 1, duration: 120, useNativeDriver: true}),
        ]),
        {iterations: 3}
      ),
      Animated.delay(300),
      Animated.timing(screenOp, {toValue: 0, duration: 260, useNativeDriver: true}),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View style={[s.splash, {opacity: screenOp}]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <Animated.View style={{alignItems: 'center', opacity: op}}>
        <Text style={s.splashLine1}>STREAK</Text>
        <Text style={s.splashLine2}>FIGHT</Text>
        <Animated.Text style={[s.splashSub, {opacity: blink}]}>· LOADING ·</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const stackOpts = {
  headerStyle: {backgroundColor: C.bgDeep, elevation: 0, shadowOpacity: 0},
  headerTintColor: C.cyan,
  headerTitleStyle: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: C.white},
  cardStyle: {backgroundColor: C.bg},
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}} />
      <Stack.Screen name="BattleDetail" component={BattleDetailScreen} options={{title: 'Battle'}} />
      <Stack.Screen name="NewBattle" component={NewBattleScreen} options={{title: 'New Battle'}} />
    </Stack.Navigator>
  );
}

function TabIcon({label, focused}) {
  return (
    <Text style={{
      fontFamily: 'PressStart2P-Regular',
      fontSize: focused ? 10 : 8,
      color: focused ? C.yellow : C.white40,
      textShadowColor: focused ? C.pink : 'transparent',
      textShadowRadius: 0,
      textShadowOffset: {width: 2, height: 2},
      lineHeight: 16,
    }}>
      {label}
    </Text>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bgDeep,
          borderTopColor: 'rgba(255,0,112,0.3)',
          borderTopWidth: 1.5,
          height: 68,
          paddingBottom: 10,
          paddingTop: 7,
        },
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.white40,
        tabBarLabelStyle: {fontFamily: 'Oswald-Bold', fontSize: 11, letterSpacing: 0.5},
      }}>
      <Tab.Screen
        name="Battles"
        component={HomeStack}
        options={{
          tabBarLabel: 'Battles',
          tabBarIcon: ({focused}) => <TabIcon label="1P" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Global',
          tabBarIcon: ({focused}) => <TabIcon label="HI" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({focused}) => <TabIcon label="ID" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppScreens() {
  return (
    <Stack.Navigator screenOptions={stackOpts}>
      <Stack.Screen name="Main" component={AppTabs} options={{headerShown: false}} />
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{headerShown: false}} />
    </Stack.Navigator>
  );
}

function Root() {
  const {user, loading, needsUsername, fetchWithAuth} = useAuth();
  const [splashDone, setSplashDone] = React.useState(false);

  useEffect(() => {
    if (!user) return;

    async function setupFCM() {
      try {
        const token = await requestPermissionAndGetToken();
        if (!token) return;

        // Persist locally so we can detect changes
        await AsyncStorage.setItem('fcm_token', token);

        // Register with backend
        await fetchWithAuth(endpoints.pushToken, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({fcm_token: token}),
        });
      } catch (e) {
        // Non-fatal — push notifications are optional
        console.warn('[FCM] setup failed:', e.message);
      }
    }

    setupFCM();

    // Keep backend in sync if the token rotates — wrapped so Firebase errors never crash the app
    let unsubscribe = () => {};
    try {
      unsubscribe = onTokenRefresh(async (newToken) => {
        try {
          await AsyncStorage.setItem('fcm_token', newToken);
          await fetchWithAuth(endpoints.pushToken, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({fcm_token: newToken}),
          });
        } catch (e) {
          console.warn('[FCM] token refresh sync failed:', e.message);
        }
      });
    } catch (e) {
      console.warn('[FCM] onTokenRefresh registration failed:', e.message);
    }

    return unsubscribe;
  }, [user]);

  if (!splashDone || loading) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }
  if (!user) return <AuthScreen />;
  if (needsUsername) return <UsernameSetupScreen />;
  return <AppScreens />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: C.bgDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  splashLine1: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 28, color: C.yellow, letterSpacing: 2, marginBottom: 6,
  },
  splashLine2: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 28, color: '#fff', letterSpacing: 2, marginBottom: 24,
  },
  splashSub: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8, color: C.cyan, letterSpacing: 3,
  },
});
