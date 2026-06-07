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

const PURPLE = '#7C3AED';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning ⚡';
  if (h < 17) return 'Good afternoon ⚡';
  return 'Good evening ⚡';
}

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

  const ListHeader = (
    <View>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.sub}>
            {battles.length > 0 ? `${battles.length} active · ` : ''}
            {pendingCount > 0
              ? <Text style={styles.subPending}>{pendingCount} pending</Text>
              : battles.length > 0 ? 'all done today ✅' : 'no battles yet'}
          </Text>
        </View>
      </View>

      {pendingCount > 0 && (
        <View style={styles.todayBanner}>
          <Text style={styles.bannerEmoji}>🔥</Text>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>
              {pendingCount} battle{pendingCount !== 1 ? 's' : ''} need your check-in today!
            </Text>
            <Text style={styles.bannerSub}>Don't break your streak</Text>
          </View>
        </View>
      )}
    </View>
  );

  const EmptyState = !loading && (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>⚔️</Text>
        <Text style={styles.emptyTitle}>Start your first battle</Text>
        <Text style={styles.emptyDesc}>
          Challenge a friend to build habits together.{'\n'}AI verifies your proof daily.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('NewBattle')}>
          <Text style={styles.emptyBtnText}>Create Battle →</Text>
        </TouchableOpacity>
        <View style={styles.featurePills}>
          <View style={styles.featurePill}><Text style={styles.featurePillText}>📸 Photo proof</Text></View>
          <View style={styles.featurePill}><Text style={styles.featurePillText}>🤖 AI verified</Text></View>
          <View style={styles.featurePill}><Text style={styles.featurePillText}>💀 Real penalties</Text></View>
        </View>
      </View>
    </View>
  );

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
            onCheckinStatus={handleCheckinStatus}
            onPress={b => navigation.navigate('BattleDetail', {battle: b})}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchBattles} tintColor={PURPLE} />
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{paddingBottom: 110}}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewBattle')}>
        <Text style={styles.fabText}>⚔️  New Battle</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  topBar: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10},
  greeting: {fontSize: 26, fontWeight: '800', color: '#111827'},
  sub: {fontSize: 13, color: '#9CA3AF', marginTop: 2},
  subPending: {color: '#F97316', fontWeight: '700'},

  todayBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1, borderColor: '#FED7AA',
    borderRadius: 14, marginHorizontal: 16, marginBottom: 8,
    padding: 14, gap: 12,
  },
  bannerEmoji: {fontSize: 28},
  bannerText: {flex: 1},
  bannerTitle: {fontSize: 14, fontWeight: '700', color: '#C2410C'},
  bannerSub: {fontSize: 12, color: '#9A3412', marginTop: 2},

  emptyWrap: {paddingHorizontal: 16, paddingTop: 24},
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16,
    shadowOffset: {width: 0, height: 4}, elevation: 4,
  },
  emptyEmoji: {fontSize: 52, marginBottom: 16},
  emptyTitle: {fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center'},
  emptyDesc: {fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24},
  emptyBtn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: {width: 0, height: 4}, elevation: 5,
    marginBottom: 20,
  },
  emptyBtnText: {color: '#fff', fontWeight: '800', fontSize: 15},
  featurePills: {flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center'},
  featurePill: {
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  featurePillText: {fontSize: 11, color: '#6B7280', fontWeight: '600'},

  fab: {
    position: 'absolute', bottom: 28, right: 20,
    backgroundColor: PURPLE,
    borderRadius: 28, paddingHorizontal: 20, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: {width: 0, height: 4}, elevation: 8,
  },
  fabText: {color: '#fff', fontSize: 15, fontWeight: '800'},
});
