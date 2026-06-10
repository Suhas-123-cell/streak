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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Animated splash ────────────────────────────────────────────────
function SplashScreen({onDone}) {
  const blobScale = useRef(new Animated.Value(0)).current;
  const textY     = useRef(new Animated.Value(60)).current;
  const textOp    = useRef(new Animated.Value(0)).current;
  const drip1     = useRef(new Animated.Value(0)).current;
  const drip2     = useRef(new Animated.Value(0)).current;
  const drip3     = useRef(new Animated.Value(0)).current;
  const screenOp  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(blobScale, {toValue: 1, tension: 100, friction: 6, useNativeDriver: true}),
      Animated.parallel([
        Animated.spring(textY, {toValue: 0, tension: 80, friction: 7, useNativeDriver: true}),
        Animated.timing(textOp, {toValue: 1, duration: 220, useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(drip1, {toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.timing(drip2, {toValue: 1, duration: 380, delay: 60, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
        Animated.timing(drip3, {toValue: 1, duration: 300, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      ]),
      Animated.delay(750),
      Animated.timing(screenOp, {toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true}),
    ]).start(() => onDone());
  }, []);

  const dripTY = (a) => a.interpolate({inputRange: [0, 1], outputRange: [0, 24]});

  return (
    <Animated.View style={[s.splash, {opacity: screenOp}]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      <Animated.View style={[s.blob, {transform: [{scale: blobScale}]}]}>
        <Animated.View style={[s.drip, s.d1, {transform: [{translateY: dripTY(drip1)}]}]} />
        <Animated.View style={[s.drip, s.d2, {transform: [{translateY: dripTY(drip2)}]}]} />
        <Animated.View style={[s.drip, s.d3, {transform: [{translateY: dripTY(drip3)}]}]} />

        <Animated.View style={{opacity: textOp, transform: [{translateY: textY}]}}>
          <Text style={s.splashLine}>STREAK</Text>
          <Text style={s.splashLine}>FIGHT</Text>
        </Animated.View>
      </Animated.View>

      <Text style={s.tagline}>your group knows when you skip.</Text>
    </Animated.View>
  );
}

const stackOpts = {
  headerStyle: {backgroundColor: C.bgDeep, elevation: 0, shadowOpacity: 0},
  headerTintColor: C.cyan,
  headerTitleStyle: {fontWeight: '800', fontSize: 17, color: C.white},
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

function TabIcon({emoji, focused}) {
  return (
    <Text style={{
      fontSize: focused ? 22 : 19,
      textShadowColor: focused ? C.cyan : 'transparent',
      textShadowRadius: focused ? 10 : 0,
      textShadowOffset: {width: 0, height: 0},
    }}>
      {emoji}
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
          borderTopColor: 'rgba(78,201,232,0.2)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.yellow,
        tabBarInactiveTintColor: C.white40,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '700', letterSpacing: 0.4},
      }}>
      <Tab.Screen
        name="Battles"
        component={HomeStack}
        options={{
          tabBarLabel: 'Battles',
          tabBarIcon: ({focused}) => <TabIcon emoji="⚔️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Global',
          tabBarIcon: ({focused}) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({focused}) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const {user, loading, fetchWithAuth} = useAuth();
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
  return user ? <AppTabs /> : <AuthScreen />;
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
  blob: {
    backgroundColor: '#EEEDF8',
    width: 300, height: 148,
    borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.cyan, shadowOpacity: 0.55,
    shadowRadius: 32, shadowOffset: {width: 0, height: 0},
    elevation: 20, overflow: 'visible',
  },
  splashLine: {
    fontSize: 44, fontWeight: '900', color: C.yellow,
    letterSpacing: 5,
    textShadowColor: C.cyan, textShadowRadius: 8,
    textShadowOffset: {width: 2, height: 2},
    lineHeight: 50, textAlign: 'center',
  },
  drip: {
    position: 'absolute', bottom: -6,
    width: 11, height: 18, borderRadius: 6, backgroundColor: C.yellow,
  },
  d1: {left: '28%'},
  d2: {left: '48%'},
  d3: {left: '66%'},
  tagline: {
    marginTop: 36, color: C.white40,
    fontSize: 12, fontWeight: '600',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});
