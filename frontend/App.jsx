import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {ActivityIndicator, View, Text} from 'react-native';
import {AuthProvider, useAuth} from './src/context/AuthContext';

import HomeScreen from './src/screens/HomeScreen';
import BattleDetailScreen from './src/screens/BattleDetailScreen';
import NewBattleScreen from './src/screens/NewBattleScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const PURPLE = '#7C3AED';

const stackOpts = {
  headerStyle: {backgroundColor: '#fff', elevation: 0, shadowOpacity: 0},
  headerTintColor: '#111827',
  headerTitleStyle: {fontWeight: '700', fontSize: 17},
  cardStyle: {backgroundColor: '#F9FAFB'},
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

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Battles"
        component={HomeStack}
        options={{tabBarLabel: 'Battles', tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>⚔️</Text>}}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{tabBarLabel: 'Global', tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>🏆</Text>}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: 'Profile', tabBarIcon: ({color}) => <Text style={{fontSize: 20, color}}>👤</Text>}}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const {user, loading} = useAuth();
  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
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
