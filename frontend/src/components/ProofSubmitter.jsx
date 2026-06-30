import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, Vibration, Modal, SafeAreaView} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {useCheckin} from '../hooks/useCheckin';
import AIVerdictCard from './AIVerdictCard';
import {C} from '../constants/theme';

const recorder = new AudioRecorderPlayer();

export default function ProofSubmitter({battleId, onSuccess}) {
  const {submitCheckin, loading, result} = useCheckin();
  const [recording, setRecording] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const enterAnim   = useRef(new Animated.Value(0)).current;
  const celebScale  = useRef(new Animated.Value(1)).current;
  const celebFlash  = useRef(new Animated.Value(0)).current;
  const modalScale  = useRef(new Animated.Value(0.7)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enterAnim, {toValue: 1, tension: 180, friction: 8, useNativeDriver: true}).start();
  }, []);

  useEffect(() => {
    if (!result) return;
    if (result.ai_verified === true) {
      Vibration.vibrate([0, 60, 40, 120]);
      setShowModal(true);
      Animated.parallel([
        Animated.spring(modalScale, {toValue: 1, tension: 120, friction: 7, useNativeDriver: true}),
        Animated.timing(modalOpacity, {toValue: 1, duration: 220, useNativeDriver: true}),
      ]).start();
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
        backgroundColor: result?.ai_verified === true ? C.lime : C.pink,
        opacity: celebFlash,
      }]} pointerEvents="none" />

      <Text style={styles.title}>PROOF ROUND</Text>
      <Text style={styles.sub}>Submit photo or voice proof. AI checks the run.</Text>
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={handlePhoto} disabled={loading}>
          <Text style={styles.btnIcon}>CAM</Text>
          <Text style={styles.btnLabel}>PHOTO</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, recording && styles.btnActive]}
          onPress={recording ? stopRecording : startRecording}
          disabled={loading}>
          <Text style={[styles.btnIcon, recording && {color: C.ink}]}>
            {recording ? 'STOP' : 'MIC'}
          </Text>
          <Text style={[styles.btnLabel, recording && {color: C.bgDeep}]}>
            {recording ? 'RECORDING' : 'VOICE'}
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.pink} />
          <Text style={styles.loadingText}>AI VERIFYING...</Text>
        </View>
      )}
      {result && result.ai_verified !== true && <AIVerdictCard checkin={result} />}

      {/* Full-screen celebration for verified check-ins */}
      <Modal visible={showModal} transparent animationType="none" statusBarTranslucent>
        <SafeAreaView style={modal.backdrop}>
          <Animated.View style={[modal.card, {opacity: modalOpacity, transform: [{scale: modalScale}]}]}>
            <Text style={modal.crown}>♛</Text>
            <Text style={modal.headline}>VERIFIED</Text>
            <Text style={modal.score}>{result?.ai_score}/100</Text>
            {result?.ai_reasoning ? (
              <Text style={modal.reason}>{result.ai_reasoning}</Text>
            ) : null}
            <Text style={modal.streak}>Streak updated ✓</Text>
            <TouchableOpacity
              style={modal.doneBtn}
              onPress={() => { setShowModal(false); onSuccess?.(result); }}
              activeOpacity={0.85}>
              <Text style={modal.doneBtnText}>KEEP GOING ▶</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bgSurface, padding: 20, margin: 16,
    borderWidth: 2, borderColor: 'rgba(255,45,111,0.55)',
    overflow: 'hidden',
    shadowColor: C.pink,
    shadowOpacity: 0.9,
    shadowRadius: 0,
    shadowOffset: {width: 5, height: 5},
  },
  title: {fontFamily: 'PressStart2P-Regular', fontSize: 12, color: '#FFFFFF', letterSpacing: 1, lineHeight: 20},
  sub: {fontSize: 13, color: 'rgba(255,255,255,0.50)', marginTop: 4, marginBottom: 18, fontFamily: 'Oswald-SemiBold'},
  btnRow: {flexDirection: 'row', gap: 12},
  btn: {
    flex: 1, backgroundColor: 'rgba(255,45,111,0.10)',
    paddingVertical: 22, alignItems: 'center', gap: 7,
    borderWidth: 2, borderColor: 'rgba(255,45,111,0.35)',
  },
  btnActive: {backgroundColor: '#FF2D6F', borderColor: '#FF2D6F'},
  btnIcon: {fontFamily: 'PressStart2P-Regular', fontSize: 12, color: C.pink, lineHeight: 18},
  btnLabel: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: '#FF2D6F', lineHeight: 13},
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16},
  loadingText: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: 'rgba(255,255,255,0.80)', lineHeight: 13},
});

const modal = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(5,3,10,0.96)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', alignItems: 'center',
    borderWidth: 3, borderColor: C.lime,
    backgroundColor: C.bgSurface, padding: 32,
    shadowColor: C.lime, shadowOpacity: 0.6, shadowRadius: 0, shadowOffset: {width: 6, height: 6},
  },
  crown: {fontSize: 52, marginBottom: 8},
  headline: {
    fontFamily: 'PressStart2P-Regular', fontSize: 24, color: C.lime, letterSpacing: 3, lineHeight: 36,
    textShadowColor: '#fff', textShadowOffset: {width: 2, height: 2}, textShadowRadius: 0,
  },
  score: {
    fontFamily: 'PressStart2P-Regular', fontSize: 16, color: C.yellow, marginTop: 12, lineHeight: 24,
  },
  reason: {
    fontFamily: 'Oswald-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.75)',
    textAlign: 'center', lineHeight: 20, marginTop: 12, paddingHorizontal: 8,
  },
  streak: {
    fontFamily: 'Oswald-Bold', fontSize: 13, color: C.cyan, marginTop: 16, letterSpacing: 1,
  },
  doneBtn: {
    marginTop: 28, backgroundColor: C.lime, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 16, paddingHorizontal: 32,
    shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
  },
  doneBtnText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 10, letterSpacing: 1, lineHeight: 18},
});
