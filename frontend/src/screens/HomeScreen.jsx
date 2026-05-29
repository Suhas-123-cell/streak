import React, {useEffect, useState} from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useBattles} from '../hooks/useBattles';
import {useMembers} from '../hooks/useMembers';
import BattleCard from '../components/BattleCard';
import {endpoints} from '../constants/api';

function BattleItem({battle, onPress, token, userId}) {
  const {members} = useMembers(battle.id);
  const [checkedIn, setCheckedIn] = useState(false);
  const me = members.find(m => m.user_id === userId);

  useEffect(() => {
    fetch(endpoints.todayCheckins(battle.id), {
      headers: {Authorization: `Bearer ${token}`},
    })
      .then(r => r.json())
      .then(data => setCheckedIn(data.some(c => c.user_id === userId)))
      .catch(() => {});
  }, [battle.id, token, userId]);

  return (
    <BattleCard
      battle={battle}
      members={members}
      myStreak={me?.current_streak || 0}
      checkedIn={checkedIn}
      onPress={() => onPress(battle)}
    />
  );
}

export default function HomeScreen({navigation}) {
  const {user, token} = useAuth();
  const {battles, loading, fetchBattles} = useBattles();

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={battles}
        keyExtractor={b => b.id}
        renderItem={({item}) => (
          <BattleItem
            battle={item}
            token={token}
            userId={user.id}
            onPress={b => navigation.navigate('BattleDetail', {battle: b})}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchBattles} tintColor="#6C47FF" />
        }
        ListHeaderComponent={<Text style={styles.heading}>My Battles</Text>}
        ListEmptyComponent={
          !loading && <Text style={styles.empty}>No battles yet. Hit + to create one!</Text>
        }
        contentContainerStyle={{paddingBottom: 100}}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewBattle')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A1A'},
  heading: {color: '#fff', fontSize: 26, fontWeight: '800', margin: 16},
  empty: {color: '#888', textAlign: 'center', marginTop: 60, fontSize: 15},
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6C47FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#6C47FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
