import React, {useEffect, useState, useCallback} from 'react';
import {
  View, FlatList, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {useBattles} from '../hooks/useBattles';
import {useMembers} from '../hooks/useMembers';
import BattleCard from '../components/BattleCard';
import {endpoints} from '../constants/api';

const BG = '#F8F7F4';
const ACCENT = '#7C3AED';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';

function BattleItem({battle, onPress, token, userId, onCheckinStatus}) {
  const {members} = useMembers(battle.id);
  const [checkedIn, setCheckedIn] = useState(false);
  const me = members.find(m => m.user_id === userId);

  useEffect(() => {
    fetch(endpoints.todayCheckins(battle.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => {
        const status = Array.isArray(data) && data.some(c => c.user_id === userId);
        setCheckedIn(status);
        onCheckinStatus?.(battle.id, status);
      })
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
  const [checkinStatus, setCheckinStatus] = useState({});

  const handleCheckinStatus = useCallback((battleId, status) => {
    setCheckinStatus(prev => ({...prev, [battleId]: status}));
  }, []);

  const pendingCount = battles.filter(b => checkinStatus[b.id] === false).length;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Battles</Text>
        <Text style={styles.dateText}>{today}</Text>
      </View>

      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingLine1}>
            {pendingCount} battle{pendingCount !== 1 ? 's' : ''} still waiting on your proof
          </Text>
          <Text style={styles.pendingLine2}>Don't let your streak die today</Text>
        </View>
      )}
    </View>
  );

  const EmptyState = !loading && (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No battles yet.</Text>
      <Text style={styles.emptyDesc}>
        Start one and make your habits impossible to fake.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('NewBattle')}
        activeOpacity={0.8}>
        <Text style={styles.emptyBtnText}>Start a battle</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <FlatList
        data={battles}
        keyExtractor={b => b.id}
        renderItem={({item}) => (
          <BattleItem
            battle={item}
            token={token}
            userId={user.id}
            onCheckinStatus={handleCheckinStatus}
            onPress={b => navigation.navigate('BattleDetail', {battle: b})}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchBattles} tintColor={ACCENT} />
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{paddingBottom: 110}}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewBattle')}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},

  header: {paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12},
  title: {fontSize: 28, fontWeight: '800', color: TEXT_1},
  dateText: {fontSize: 13, color: TEXT_2, marginTop: 2},

  pendingBanner: {
    backgroundColor: '#FEF3E2', borderRadius: 10,
    padding: 14, marginHorizontal: 16, marginBottom: 4,
  },
  pendingLine1: {fontSize: 14, fontWeight: '600', color: '#92400E'},
  pendingLine2: {fontSize: 12, color: '#B45309', marginTop: 2},

  emptyWrap: {paddingTop: 60, paddingHorizontal: 28},
  emptyTitle: {fontSize: 22, fontWeight: '700', color: TEXT_1},
  emptyDesc: {fontSize: 15, color: TEXT_2, lineHeight: 22, marginTop: 8},
  emptyBtn: {
    borderWidth: 1.5, borderColor: ACCENT, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 20,
    alignSelf: 'flex-start', marginTop: 24,
  },
  emptyBtnText: {color: ACCENT, fontWeight: '600', fontSize: 15},

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 8,
  },
  fabText: {color: '#fff', fontSize: 26, fontWeight: '400', lineHeight: 30},
});
