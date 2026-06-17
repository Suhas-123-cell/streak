import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, Vibration} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {useCheckin} from '../hooks/useCheckin';
import AIVerdictCard from './AIVerdictCard';
import {C} from '../constants/theme';

const recorder = new AudioRecorderPlayer();

export default function ProofSubmitter({battleId, onSuccess}) {
  const {submitCheckin, loading, result} = useCheckin();
  const [recording, setRecording] = useState(false);
  const enterAnim  = useRef(new Animated.Value(0)).current;
  const celebScale = useRef(new Animated.Value(1)).current;
  const celebFlash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {toValue: 1, tension: 180, friction: 8, useNativeDriver: true}).start();
  }, []);

  useEffect(() => {
    if (!result) return;
    // Haptic pattern: short-short-long for success, single for fail
    if (result.ai_verified === true) {
      Vibration.vibrate([0, 60, 40, 120]);
    } else {
      Vibration.vibrate(80);
    }
    Animated.sequence([
      Animated.parallel([
        Animated.spring(celebScale, {toValue: 1.06, tension: 400, friction: 5, useNativeDriver: true}),
        Animated.timing(celebFlash, {toValue: 1, duration: 160, useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.spring(celebScale, {toValue: 1, tension: 300, friction: 7, useNativeDriver: true}),
        Animated.timing(celebFlash, {toValue: 0, duration: 450, useNativeDriver: true}),
      ]),
    ]).start();
  }, [result]);

  async function handlePhoto() {
    const response = await launchCamera({mediaType: 'photo', quality: 0.8, saveToPhotos: false});
    if (response.didCancel || response.errorCode) return;
    const asset = response.assets?.[0];
    if (!asset?.uri) return;
    try {
      const data = await submitCheckin(
        battleId, 'photo', asset.uri,
        asset.fileName || 'photo.jpg', asset.type || 'image/jpeg',
      );
      if (data?.ai_verified !== undefined) onSuccess?.(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function startRecording() {
    await recorder.startRecorder();
    setRecording(true);
    setTimeout(stopRecording, 10000);
  }

  async function stopRecording() {
    const path = await recorder.stopRecorder();
    setRecording(false);
    try {
      const data = await submitCheckin(
        battleId, 'voice', `file://${path}`, 'voice.m4a', 'audio/mp4',
      );
      if (data?.ai_verified !== undefined) onSuccess?.(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <Animated.View style={[styles.container, {
      opacity: enterAnim,
      transform: [
        {translateY: enterAnim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})},
        {scale: celebScale},
      ],
    }]}>
      {/* Celebration flash overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, {
        borderRadius: 20,
        backgroundColor: result?.ai_verified === true ? C.lime : C.pink,
        opacity: celebFlash,
      }]} pointerEvents="none" />

      <Text style={styles.title}>Prove it.</Text>
      <Text style={styles.sub}>Drop your proof — AI checks it in seconds</Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={handlePhoto} disabled={loading}>
          <Text style={styles.btnIcon}>📸</Text>
          <Text style={styles.btnLabel}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, recording && styles.btnActive]}
          onPress={recording ? stopRecording : startRecording}
          disabled={loading}>
          <Text style={styles.btnIcon}>{recording ? '⏹' : '🎤'}</Text>
          <Text style={[styles.btnLabel, recording && {color: C.bgDeep}]}>
            {recording ? 'Stop' : 'Voice'}
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.pink} />
          <Text style={styles.loadingText}>AI is verifying... ⚡</Text>
        </View>
      )}
      {result && <AIVerdictCard checkin={result} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(170,0,255,0.06)', borderRadius: 20, padding: 20, margin: 16,
    borderWidth: 1.5, borderColor: 'rgba(170,0,255,0.3)',
    shadowColor: C.purple, shadowOpacity: 0.2, shadowRadius: 18,
    shadowOffset: {width: 0, height: 0}, elevation: 6,
    overflow: 'hidden',
  },
  title: {fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: 0.3},
  sub: {fontSize: 13, color: C.white40, marginTop: 3, marginBottom: 18, fontWeight: '600'},
  btnRow: {flexDirection: 'row', gap: 12},
  btn: {
    flex: 1, backgroundColor: 'rgba(255,0,112,0.08)', borderRadius: 16,
    paddingVertical: 22, alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,0,112,0.3)',
  },
  btnActive: {backgroundColor: C.pink, borderColor: C.pink},
  btnIcon: {fontSize: 30},
  btnLabel: {fontSize: 13, fontWeight: '800', color: C.pink},
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16},
  loadingText: {color: C.white70, fontSize: 14, fontWeight: '700'},
});
