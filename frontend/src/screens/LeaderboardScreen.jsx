import React, {useEffect, useState, useRef} from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  RefreshControl, Image, StatusBar, Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, ScreenTitle} from '../components/ArcadeUI';

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
  const medal = rank === 1 ? '01' : rank === 2 ? '02' : rank === 3 ? '03' : null;
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
          <Text style={[styles.name, rank === 1 && {color: '#FFD400'}, isMe && {color: C.cyan}]}>
            {item.username}{isMe ? ' (you)' : ''}
          </Text>
          <Text style={styles.stats}>{item.total_wins} WINS · {item.active_streak} STREAK</Text>
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
      
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <LeaderboardRow item={item} rank={index + 1} isMe={item.id === user.id} delay={index * 60} />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <ArcadeTopBar center="GLOBAL SCORE" right="CPU" />
            <ScreenTitle subtitle="Ranked by current streak">
              GLOBAL{'\n'}LEADERBOARD
            </ScreenTitle>
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
  header: {paddingBottom: 4},
  heading: {
    fontFamily: 'PressStart2P-Regular', fontSize: 14, color: '#FFD400',
    letterSpacing: 1.5, lineHeight: 26,
    textShadowColor: '#FF2D6F', textShadowRadius: 0,
    textShadowOffset: {width: 2, height: 2},
  },
  sub: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 4, fontFamily: 'Oswald-SemiBold'},
  list: {paddingBottom: 40},
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
    backgroundColor: '#160f1e', position: 'relative', overflow: 'hidden',
    marginHorizontal: 12, marginVertical: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
  },
  myRow: {backgroundColor: 'rgba(25,224,255,0.08)', borderColor: 'rgba(25,224,255,0.25)', borderWidth: 2},
  myAccent: {position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.cyan},
  rankWrap: {width: 38, alignItems: 'center'},
  medal: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: C.yellow, lineHeight: 15},
  rankNum: {fontFamily: 'PressStart2P-Regular', fontSize: 10, color: 'rgba(255,255,255,0.50)', lineHeight: 16},
  avatar: {width: 46, height: 46, marginRight: 12},
  avatarFb: {
    backgroundColor: 'rgba(170,0,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#AA00FF',
  },
  avatarInitial: {fontSize: 17, fontFamily: 'Oswald-Bold', color: C.purple},
  info: {flex: 1},
  name: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
  stats: {fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 4, fontFamily: 'Oswald-SemiBold'},
  sep: {height: 4, backgroundColor: 'transparent'},
  rankBadge: {
    borderWidth: 2, paddingHorizontal: 6, paddingVertical: 3,
  },
  rankBadgeText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, lineHeight: 13},
});
