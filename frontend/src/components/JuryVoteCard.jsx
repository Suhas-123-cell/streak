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
        <Text style={styles.badge}>⚖️ JURY</Text>
        <Text style={styles.name}>{username}'s proof</Text>
      </View>
      <Text style={styles.sub}>AI wasn't sure (score {checkin.ai_score}/100). Group decides.</Text>

      {votes && (
        <View style={styles.tally}>
          <Text style={styles.tallyText}>
            {votes.approvals} ✅  ·  {votes.total - votes.approvals} ❌  ·  {votes.total} voted
          </Text>
        </View>
      )}

      {isOwn ? (
        <Text style={styles.waiting}>Waiting for your group to vote…</Text>
      ) : votes?.my_vote != null ? (
        <Text style={styles.voted}>
          You voted {votes.my_vote ? '✅ Approve' : '❌ Reject'}
        </Text>
      ) : submitting ? (
        <ActivityIndicator color={C.cyan} style={{marginTop: 10}} />
      ) : (
        <View style={styles.btns}>
          <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => castVote(true)}>
            <Text style={styles.btnText}>✅ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => castVote(false)}>
            <Text style={styles.btnText}>❌ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(232,245,49,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,245,49,0.3)',
  },
  header: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  badge: {
    fontSize: 11, fontWeight: '800', color: C.yellow,
    backgroundColor: 'rgba(232,245,49,0.12)',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  name: {fontWeight: '700', color: C.white, fontSize: 14},
  sub: {color: C.white40, fontSize: 13, marginBottom: 10},
  tally: {
    backgroundColor: C.white08, borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 10,
  },
  tallyText: {color: C.white70, fontSize: 13, fontWeight: '600'},
  waiting: {color: C.white40, fontSize: 13, fontStyle: 'italic'},
  voted: {color: C.white70, fontSize: 14, fontWeight: '600'},
  btns: {flexDirection: 'row', gap: 8},
  btn: {flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center'},
  approveBtn: {
    backgroundColor: 'rgba(110,231,138,0.15)',
    borderWidth: 1, borderColor: 'rgba(110,231,138,0.4)',
  },
  rejectBtn: {
    backgroundColor: 'rgba(255,56,100,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,56,100,0.35)',
  },
  btnText: {color: C.white, fontWeight: '700', fontSize: 14},
});
