import React, {useEffect, useState, useRef} from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, Image, StatusBar, Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

function AmbientBg() {
  const o1 = useRef(new Animated.Value(0)).current;
  const o2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (v, dur, delay) => Animated.loop(Animated.sequence([
      Animated.timing(v, {toValue: -20, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(v, {toValue: 0,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
    loop(o1, 5000, 0);
    loop(o2, 6200, 700);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{position: 'absolute', width: 260, height: 260, borderRadius: 130,
        backgroundColor: 'rgba(170,0,255,0.09)', top: -80, right: -80, transform: [{translateY: o1}]}} />
      <Animated.View style={{position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,0,112,0.07)', bottom: 100, left: -60, transform: [{translateY: o2}]}} />
    </View>
  );
}

function Top3Shimmer() {
  const x = useRef(new Animated.Value(-100)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(1500),
      Animated.timing(x, {toValue: 420, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      Animated.timing(x, {toValue: -100, duration: 0, useNativeDriver: true}),
    ])).start();
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: 80,
        backgroundColor: 'rgba(255,255,255,0.06)',
        transform: [{translateX: x}, {skewX: '-20deg'}],
      }} />
    </View>
  );
}

const TOP3 = [
  {border: C.yellow, bg: 'rgba(255,224,0,0.09)',  shadow: C.yellow},
  {border: C.white40, bg: 'rgba(255,255,255,0.06)', shadow: '#fff'},
  {border: C.orange,  bg: 'rgba(255,102,0,0.07)',  shadow: C.orange},
];

function LeaderboardRow({item, rank, isMe, delay}) {
  const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
  const top = rank <= 3 ? TOP3[rank - 1] : null;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: delay || 0,
      tension: 220, friction: 9, useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{translateX: anim.interpolate({inputRange: [0, 1], outputRange: [-28, 0]})}],
    }}>
      <View style={[
        styles.row,
        isMe && styles.myRow,
        top && {backgroundColor: top.bg, borderColor: top.border, borderWidth: 1,
          shadowColor: top.shadow, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: {width: 0, height: 0}},
      ]}>
        {top && <Top3Shimmer />}
        {isMe && <View style={styles.myAccent} />}
        <View style={styles.rankWrap}>
          {medal
            ? <Text style={styles.medal}>{medal}</Text>
            : <Text style={styles.rankNum}>{rank}</Text>}
        </View>
        {item.avatar_url ? (
          <Image source={{uri: item.avatar_url}} style={[styles.avatar, top && {borderColor: top.border, borderWidth: 2}]} />
        ) : (
          <View style={[styles.avatar, styles.avatarFb, isMe && {backgroundColor: 'rgba(0,229,255,0.18)'},
            top && {borderColor: top.border, borderWidth: 2}]}>
            <Text style={[styles.avatarInitial, top && {color: top.border}, isMe && {color: C.cyan}]}>
              {(item.username || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, rank === 1 && {color: C.yellow, fontWeight: '900'}, isMe && {color: C.cyan}]}>
            {item.username}{isMe ? ' (you)' : ''}
          </Text>
          <Text style={styles.stats}>🏆 {item.total_wins} wins · 🔥 {item.active_streak} streak</Text>
        </View>
        {top && (
          <View style={[styles.rankBadge, {borderColor: top.border, backgroundColor: top.bg}]}>
            <Text style={[styles.rankBadgeText, {color: top.border}]}>#{rank}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function LeaderboardScreen() {
  const {user, token} = useAuth();
  const [data, setData]       = useState([]);
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
      <AmbientBg />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <LeaderboardRow item={item} rank={index + 1} isMe={item.id === user.id} delay={index * 60} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Global Leaderboard</Text>
            <Text style={styles.sub}>Ranked by current streak</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={C.cyan} />
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
    fontSize: 30, fontWeight: '900', color: C.yellow,
    letterSpacing: 1.5,
    textShadowColor: C.pink, textShadowRadius: 14,
    textShadowOffset: {width: 0, height: 0},
  },
  sub: {fontSize: 13, color: C.white40, marginTop: 4, fontWeight: '600'},
  list: {paddingBottom: 40},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
    backgroundColor: C.card, position: 'relative', overflow: 'hidden',
    marginHorizontal: 12, marginVertical: 4, borderRadius: 16,
  },
  myRow: {backgroundColor: 'rgba(0,229,255,0.08)', borderColor: 'rgba(0,229,255,0.25)', borderWidth: 1},
  myAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.cyan},
  rankWrap: {width: 38, alignItems: 'center'},
  medal: {fontSize: 22},
  rankNum: {fontSize: 14, color: C.white40, fontWeight: '800'},
  avatar: {width: 46, height: 46, borderRadius: 23, marginRight: 12},
  avatarFb: {
    backgroundColor: 'rgba(170,0,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.purple,
  },
  avatarInitial: {fontSize: 17, fontWeight: '800', color: C.purple},
  info: {flex: 1},
  name: {fontSize: 15, fontWeight: '700', color: C.white},
  stats: {fontSize: 12, color: C.white40, marginTop: 3},
  sep: {height: 4, backgroundColor: 'transparent'},
  rankBadge: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  rankBadgeText: {fontSize: 12, fontWeight: '900'},
});
