import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {ActivityIndicator, View} from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import BattleDetailScreen from './src/screens/BattleDetailScreen';
import NewBattleScreen from './src/screens/NewBattleScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AuthScreen from './src/screens/AuthScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const tabBarStyle = {
  backgroundColor: '#0A0A1A',
  borderTopColor: '#1E1E3F',
};

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#0A0A1A'},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '800'},
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Streak Fight'}} />
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
        tabBarStyle,
        tabBarActiveTintColor: '#6C47FF',
        tabBarInactiveTintColor: '#555',
      }}>
      <Tab.Screen name="Battles" component={HomeStack} options={{tabBarLabel: '⚔️ Battles'}} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{tabBarLabel: '🏆 Global'}} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{tabBarLabel: '👤 Profile'}} />
    </Tab.Navigator>
  );
}

function Root() {
  const {user, loading} = useAuth();
  if (loading) {
    return (
      <View style={{flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#6C47FF" />
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
