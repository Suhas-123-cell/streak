import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {useCheckin} from '../hooks/useCheckin';
import AIVerdictCard from './AIVerdictCard';

const recorder = new AudioRecorderPlayer();

export default function ProofSubmitter({battleId, onSuccess}) {
  const {submitCheckin, loading, result} = useCheckin();
  const [recording, setRecording] = useState(false);
  const [audioPath, setAudioPath] = useState(null);

  async function handlePhoto() {
    launchCamera({mediaType: 'photo', quality: 0.7}, async response => {
      if (response.didCancel || response.errorCode) return;
      const asset = response.assets[0];
      try {
        const data = await submitCheckin(
          battleId,
          'photo',
          asset.uri,
          asset.fileName || 'photo.jpg',
          asset.type || 'image/jpeg',
        );
        if (data.ai_verified) onSuccess?.();
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    });
  }

  async function startRecording() {
    const path = await recorder.startRecorder();
    setAudioPath(path);
    setRecording(true);
    setTimeout(stopRecording, 10000);
  }

  async function stopRecording() {
    const path = await recorder.stopRecorder();
    setRecording(false);
    setAudioPath(path);
    try {
      const data = await submitCheckin(
        battleId,
        'voice',
        `file://${path}`,
        'voice.m4a',
        'audio/m4a',
      );
      if (data.ai_verified) onSuccess?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submit Proof</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={handlePhoto} disabled={loading}>
          <Text style={styles.btnText}>📸 Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, recording && styles.recording]}
          onPress={recording ? stopRecording : startRecording}
          disabled={loading}>
          <Text style={styles.btnText}>{recording ? '⏹ Stop' : '🎤 Voice'}</Text>
        </TouchableOpacity>
      </View>
      {loading && <ActivityIndicator color="#6C47FF" style={{marginTop: 12}} />}
      {result && <AIVerdictCard checkin={result} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16},
  title: {color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12},
  row: {flexDirection: 'row', gap: 12},
  btn: {
    flex: 1,
    backgroundColor: '#6C47FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recording: {backgroundColor: '#FF4444'},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 15},
});
