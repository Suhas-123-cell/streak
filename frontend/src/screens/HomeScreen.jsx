import React, {useEffect, useState} from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useBattles} from '../hooks/useBattles';
import {useMembers} from '../hooks/useMembers';
import BattleCard from '../components/BattleCard';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';

function BattleItem({battle, onPress, token, userId}) {
  const {members} = useMembers(battle.id);
  const [checkedIn, setCheckedIn] = useState(false);
  const me = members.find(m => m.user_id === userId);

  useEffect(() => {
    fetch(endpoints.todayCheckins(battle.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => setCheckedIn(Array.isArray(data) && data.some(c => c.user_id === userId)))
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
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
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
          <RefreshControl refreshing={loading} onRefresh={fetchBattles} tintColor={PURPLE} />
        }
        ListHeaderComponent={
          <View style={styles.topBar}>
            <View>
              <Text style={styles.greeting}>My Battles</Text>
              <Text style={styles.sub}>{battles.length} active</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚔️</Text>
              <Text style={styles.emptyText}>No battles yet</Text>
              <Text style={styles.emptyHint}>Create one and challenge your friends</Text>
            </View>
          )
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
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  topBar: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8},
  greeting: {fontSize: 28, fontWeight: '800', color: '#111827'},
  sub: {fontSize: 13, color: '#9CA3AF', marginTop: 2},
  empty: {alignItems: 'center', paddingTop: 80},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyText: {fontSize: 18, fontWeight: '700', color: '#111827'},
  emptyHint: {fontSize: 14, color: '#9CA3AF', marginTop: 4},
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: {width: 0, height: 4}, elevation: 8,
  },
  fabText: {color: '#fff', fontSize: 28, lineHeight: 32},
});
