import React, {useEffect, useState} from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, Image, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

import {C} from '../constants/theme';
const PURPLE = C.cyan;

function LeaderboardRow({item, rank, isMe}) {
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <View style={[styles.row, isMe && styles.myRow]}>
      {isMe && <View style={styles.myAccent} />}
      <View style={styles.rankWrap}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={styles.rankNum}>{rank}</Text>
        )}
      </View>
      {item.avatar_url ? (
        <Image source={{uri: item.avatar_url}} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFb, isMe && {backgroundColor: PURPLE}]}>
          <Text style={styles.avatarInitial}>{(item.username || '?')[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.username}{isMe ? ' (you)' : ''}</Text>
        <Text style={styles.stats}>🏆 {item.total_wins} wins · 🔥 {item.active_streak} streak</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const {user, token} = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(endpoints.globalLeaderboard, {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <LeaderboardRow item={item} rank={index + 1} isMe={item.id === user.id} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Global Leaderboard</Text>
            <Text style={styles.sub}>Top streak fighters worldwide</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={PURPLE} />
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  header: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12},
  heading: {
    fontSize: 26, fontWeight: '900', color: C.yellow,
    letterSpacing: 1,
    textShadowColor: C.cyan, textShadowRadius: 6,
    textShadowOffset: {width: 1, height: 1},
  },
  sub: {fontSize: 13, color: C.white40, marginTop: 2},
  list: {paddingBottom: 40},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.card, position: 'relative', overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: C.white08,
  },
  myRow: {backgroundColor: 'rgba(78,201,232,0.08)'},
  myAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.yellow},
  rankWrap: {width: 36, alignItems: 'center'},
  medal: {fontSize: 20},
  rankNum: {fontSize: 14, color: C.white40, fontWeight: '700'},
  avatar: {width: 42, height: 42, borderRadius: 21, marginRight: 12},
  avatarFb: {
    backgroundColor: 'rgba(78,201,232,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.cyan,
  },
  avatarInitial: {fontSize: 16, fontWeight: '700', color: C.cyan},
  info: {flex: 1},
  name: {fontSize: 15, fontWeight: '700', color: C.white},
  stats: {fontSize: 12, color: C.white40, marginTop: 2},
  sep: {height: 1, backgroundColor: C.white08},
});
