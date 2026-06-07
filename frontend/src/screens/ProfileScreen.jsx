import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const PURPLE = '#7C3AED';
const DARK_PURPLE = '#4C1D95';

function StatCard({emoji, value, label}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const {user, token, logout} = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetch(endpoints.profile(user.id), {headers: {Authorization: `Bearer ${token}`}})
      .then(r => r.json())
      .then(data => setProfile(data))
      .catch(() => {});
  }, []);

  const initial = (profile?.username || user?.email || '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_PURPLE} />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <Text style={styles.username}>{profile?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Stats 2x2 grid */}
        <View style={styles.statsGrid}>
          <StatCard emoji="🏆" value={profile?.total_wins || 0} label="Total Wins" />
          <StatCard emoji="🔥" value={profile?.active_streak || 0} label="Best Streak" />
          <StatCard emoji="⚔️" value={profile?.battles_count || 0} label="Battles" />
          <StatCard emoji="✅" value={profile?.total_checkins || 0} label="Check-ins" />
        </View>

        {/* Motivational quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            💪 Every check-in is a vote for who you're becoming.
          </Text>
        </View>

      </ScrollView>
      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F9FAFB'},
  content: {paddingBottom: 20},

  heroBanner: {
    backgroundColor: DARK_PURPLE,
    paddingTop: 36, paddingBottom: 36,
    alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(124,58,237,0.35)', top: -40, right: -40,
  },
  circle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(167,139,250,0.2)', bottom: -20, left: -20,
  },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontSize: 32, fontWeight: '800'},
  username: {fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4},
  email: {fontSize: 13, color: 'rgba(196,181,253,0.8)'},

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, paddingTop: 20, gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}, elevation: 2,
  },
  statEmoji: {fontSize: 22, marginBottom: 6},
  statNum: {fontSize: 28, fontWeight: '800', color: PURPLE},
  statLabel: {fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '600'},

  quoteCard: {
    backgroundColor: '#EDE9FE', borderWidth: 1, borderColor: '#DDD6FE',
    borderRadius: 14, marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  quoteText: {
    color: '#5B21B6', fontSize: 13, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 20,
  },

  logoutWrap: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  logoutBtn: {
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#EF4444',
  },
  logoutText: {color: '#EF4444', fontWeight: '700', fontSize: 15},
});
