import React, {useEffect, useState} from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, Image,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

function LeaderboardRow({item, rank, currentUserId}) {
  const isMe = item.id === currentUserId;
  return (
    <View style={[styles.row, isMe && styles.myRow]}>
      <Text style={[styles.rank, rank <= 3 && styles.topRank]}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </Text>
      {item.avatar_url ? (
        <Image source={{uri: item.avatar_url}} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.placeholder]}>
          <Text style={styles.initial}>{(item.username || '?')[0].toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username}>{item.username}{isMe ? ' (you)' : ''}</Text>
        <Text style={styles.sub}>🏆 {item.total_wins} wins · 🔥 {item.active_streak} streak</Text>
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
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <LeaderboardRow item={item} rank={index + 1} currentUserId={user.id} />
        )}
        ListHeaderComponent={<Text style={styles.heading}>Global Leaderboard</Text>}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor="#6C47FF" />
        }
        contentContainerStyle={{paddingBottom: 40}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#0A0A1A'},
  heading: {color: '#fff', fontSize: 26, fontWeight: '800', margin: 16},
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    marginHorizontal: 16, marginVertical: 4, backgroundColor: '#12122A', borderRadius: 12,
  },
  myRow: {borderWidth: 1, borderColor: '#6C47FF'},
  rank: {color: '#888', width: 32, fontSize: 14, textAlign: 'center'},
  topRank: {fontSize: 20},
  avatar: {width: 40, height: 40, borderRadius: 20, marginRight: 12},
  placeholder: {backgroundColor: '#6C47FF', alignItems: 'center', justifyContent: 'center'},
  initial: {color: '#fff', fontWeight: '700', fontSize: 16},
  info: {flex: 1},
  username: {color: '#fff', fontWeight: '700', fontSize: 15},
  sub: {color: '#888', fontSize: 12, marginTop: 2},
});
