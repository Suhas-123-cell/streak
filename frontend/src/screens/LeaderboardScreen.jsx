import React, {useEffect, useState} from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, Image, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';

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
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
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
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  header: {paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12},
  heading: {fontSize: 26, fontWeight: '800', color: '#111827'},
  sub: {fontSize: 13, color: '#9CA3AF', marginTop: 2},
  list: {paddingBottom: 40},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', position: 'relative', overflow: 'hidden',
  },
  myRow: {backgroundColor: '#F5F3FF'},
  myAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: PURPLE},
  rankWrap: {width: 36, alignItems: 'center'},
  medal: {fontSize: 20},
  rankNum: {fontSize: 14, color: '#9CA3AF', fontWeight: '700'},
  avatar: {width: 42, height: 42, borderRadius: 21, marginRight: 12},
  avatarFb: {backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center'},
  avatarInitial: {fontSize: 16, fontWeight: '700', color: '#fff'},
  info: {flex: 1},
  name: {fontSize: 15, fontWeight: '700', color: '#111827'},
  stats: {fontSize: 12, color: '#9CA3AF', marginTop: 2},
  sep: {height: 1, backgroundColor: '#F3F4F6'},
});
