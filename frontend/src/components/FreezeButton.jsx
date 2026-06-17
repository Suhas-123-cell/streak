import React, {useState} from 'react';
import {View, TouchableOpacity, Text, StyleSheet, Modal, ActivityIndicator} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

export default function FreezeButton({battleId, freezeTokens, onUsed}) {
  const {token} = useAuth();
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState('');

  if (!freezeTokens || freezeTokens < 1) return null;

  async function useFreeze() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoints.useFreeze(battleId), {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setConfirmVisible(false);
      onUsed?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.btn, loading && {opacity: 0.6}]}
        onPress={() => setConfirmVisible(true)}
        disabled={loading}>
        <Text style={styles.text}>FREEZE DAY · {freezeTokens} LEFT</Text>
      </TouchableOpacity>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>USE FREEZE?</Text>
            <Text style={styles.panelCopy}>
              Protect today's streak without submitting proof.
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmVisible(false)}
                disabled={loading}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={useFreeze}
                disabled={loading}>
                {loading
                  ? <ActivityIndicator color={C.ink} />
                  : <Text style={styles.confirmText}>FREEZE ▶</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(25,224,255,0.12)',
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(25,224,255,0.4)',
  },
  text: {fontFamily: 'PressStart2P-Regular', fontSize: 9, color: '#19E0FF', lineHeight: 15},
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    backgroundColor: C.bgDeep,
    borderWidth: 2,
    borderColor: C.cyan,
    padding: 18,
    shadowColor: C.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 0,
    shadowOffset: {width: 5, height: 5},
  },
  panelTitle: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 12,
    color: C.cyan,
    lineHeight: 20,
  },
  panelCopy: {
    fontFamily: 'Oswald-SemiBold',
    fontSize: 14,
    color: C.white70,
    lineHeight: 20,
    marginTop: 8,
  },
  error: {
    fontFamily: 'Oswald-SemiBold',
    fontSize: 13,
    color: C.pink,
    marginTop: 10,
  },
  actions: {flexDirection: 'row', gap: 10, marginTop: 18},
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: C.white15,
  },
  cancelText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: C.white40,
    lineHeight: 14,
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: C.cyan,
    borderWidth: 2,
    borderColor: C.white,
  },
  confirmText: {
    fontFamily: 'PressStart2P-Regular',
    fontSize: 8,
    color: C.ink,
    lineHeight: 14,
  },
});
