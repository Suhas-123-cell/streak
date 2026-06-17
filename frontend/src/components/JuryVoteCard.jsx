import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

export default function JuryVoteCard({checkin, onResolved}) {
  const {token, user} = useAuth();
  const [votes, setVotes] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isOwn = checkin.user_id === user.id;

  useEffect(() => {
    loadVotes();
  }, [checkin.id]);

  async function loadVotes() {
    try {
      const res = await fetch(endpoints.juryVotes(checkin.id), {
        headers: {Authorization: `Bearer ${token}`},
      });
      if (res.ok) setVotes(await res.json());
    } catch {}
  }

  async function castVote(vote) {
    setSubmitting(true);
    try {
      const res = await fetch(endpoints.juryVote(checkin.id), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({vote}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      if (data.resolved) onResolved?.();
      else loadVotes();
    } catch (e) {
      loadVotes();
    } finally {
      setSubmitting(false);
    }
  }

  const username = checkin.profiles?.username || 'Someone';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.badge}>JURY</Text>
        <Text style={styles.name}>{username}'s proof</Text>
      </View>
      <Text style={styles.sub}>AI wasn't sure (score {checkin.ai_score}/100). Group decides.</Text>

      {votes && (
        <View style={styles.tally}>
          <Text style={styles.tallyText}>
            {votes.approvals} OK · {votes.total - votes.approvals} NO · {votes.total} VOTED
          </Text>
        </View>
      )}

      {isOwn ? (
        <Text style={styles.waiting}>Waiting for your group to vote…</Text>
      ) : votes?.my_vote != null ? (
        <Text style={styles.voted}>
          YOU VOTED {votes.my_vote ? 'APPROVE' : 'REJECT'}
        </Text>
      ) : submitting ? (
        <ActivityIndicator color={C.cyan} style={{marginTop: 10}} />
      ) : (
        <View style={styles.btns}>
          <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => castVote(true)}>
            <Text style={styles.btnText}>APPROVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => castVote(false)}>
            <Text style={styles.btnText}>REJECT</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,212,0,0.06)',
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,212,0,0.3)',
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  badge: {
    fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FFD400', lineHeight: 13,
    backgroundColor: 'rgba(255,212,0,0.12)',
    paddingHorizontal: 6, paddingVertical: 2,
  },
  name: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#FFFFFF', lineHeight: 15},
  sub: {color: 'rgba(255,255,255,0.50)', fontSize: 13, marginBottom: 10, fontFamily: 'Oswald-SemiBold'},
  tally: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10,
  },
  tallyText: {color: 'rgba(255,255,255,0.80)', fontSize: 13, fontFamily: 'Oswald-SemiBold'},
  waiting: {color: 'rgba(255,255,255,0.50)', fontSize: 13, fontStyle: 'italic', fontFamily: 'Oswald-SemiBold'},
  voted: {color: 'rgba(255,255,255,0.80)', fontSize: 13, fontFamily: 'Oswald-SemiBold'},
  btns: {flexDirection: 'row', gap: 8},
  btn: {flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 2},
  approveBtn: {
    backgroundColor: 'rgba(155,232,12,0.12)',
    borderColor: 'rgba(155,232,12,0.4)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(255,45,111,0.12)',
    borderColor: 'rgba(255,45,111,0.35)',
  },
  btnText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FFFFFF', lineHeight: 13},
});
