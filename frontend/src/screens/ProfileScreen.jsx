import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, StatusBar,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';

const BG = '#F8F7F4';
const ACCENT = '#7C3AED';
const TEXT_1 = '#1C1917';
const TEXT_2 = '#78716C';
const BORDER = '#E7E5E4';

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
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.topSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.username}>{profile?.username || '—'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.total_wins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.active_streak || 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.battles_count || 0}</Text>
            <Text style={styles.statLabel}>Battles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile?.total_checkins || 0}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.quote}>
          Every check-in is a vote for who you want to be.
        </Text>

      </ScrollView>

      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: BG},
  content: {paddingBottom: 20},

  topSection: {paddingTop: 32, paddingHorizontal: 20},
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontSize: 28, fontWeight: '800'},
  username: {fontSize: 22, fontWeight: '800', color: TEXT_1, marginTop: 12},
  email: {fontSize: 13, color: TEXT_2, marginTop: 2},

  divider: {height: 1, backgroundColor: BORDER, marginHorizontal: 20, marginVertical: 20},

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  stat: {},
  statNum: {fontSize: 24, fontWeight: '800', color: TEXT_1},
  statLabel: {fontSize: 11, color: TEXT_2, marginTop: 2},

  quote: {
    fontSize: 14, fontStyle: 'italic', color: TEXT_2,
    lineHeight: 20, paddingHorizontal: 20, marginBottom: 8,
  },

  logoutWrap: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: BG,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  logoutBtn: {
    borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  logoutText: {color: '#DC2626', fontWeight: '600', fontSize: 15},
});
