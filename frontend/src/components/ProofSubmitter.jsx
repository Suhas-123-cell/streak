import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {useCheckin} from '../hooks/useCheckin';
import AIVerdictCard from './AIVerdictCard';
import {C} from '../constants/theme';

const recorder = new AudioRecorderPlayer();

export default function ProofSubmitter({battleId, onSuccess}) {
  const {submitCheckin, loading, result} = useCheckin();
  const [recording, setRecording] = useState(false);

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
      if (data?.ai_verified) onSuccess?.();
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
      if (data?.ai_verified) onSuccess?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submit Proof</Text>
      <Text style={styles.sub}>Show you completed the habit today</Text>
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
          <ActivityIndicator color={C.cyan} />
          <Text style={styles.loadingText}>AI is verifying...</Text>
        </View>
      )}
      {result && <AIVerdictCard checkin={result} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.card, borderRadius: 16, padding: 20, margin: 16,
    borderWidth: 1, borderColor: C.cardBorder,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: {width: 0, height: 3}, elevation: 3,
  },
  title: {fontSize: 17, fontWeight: '700', color: C.white},
  sub: {fontSize: 13, color: C.white40, marginTop: 2, marginBottom: 16},
  btnRow: {flexDirection: 'row', gap: 12},
  btn: {
    flex: 1, backgroundColor: 'rgba(78,201,232,0.1)', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: C.cardBorder,
  },
  btnActive: {backgroundColor: C.yellow, borderColor: C.yellow},
  btnIcon: {fontSize: 24},
  btnLabel: {fontSize: 13, fontWeight: '600', color: C.cyan},
  loadingRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14},
  loadingText: {color: C.white40, fontSize: 13},
});
