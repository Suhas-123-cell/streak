import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
  Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C, PIXEL} from '../constants/theme';

const COLORS = [
  {key: 'pink',   hex: C.pink},
  {key: 'cyan',   hex: C.cyan},
  {key: 'yellow', hex: C.yellow},
  {key: 'lime',   hex: C.lime},
  {key: 'purple', hex: C.purple},
];

const RANK_LABELS = ['ROOKIE', 'FIGHTER', 'CHAMP', 'MASTER'];

// ── Hard offset pixel-art drop-shadow card ───────────────────────────
function HardCard({borderColor, shadowColor, children, style}) {
  return (
    <View style={{marginBottom: 6}}>
      {/* offset shadow layer */}
      <View style={[StyleSheet.absoluteFill, {
        top: 5, left: 0, right: -5, bottom: -5,
        backgroundColor: shadowColor,
      }]} />
      <View style={[{borderWidth: 2, borderColor, backgroundColor: '#0e0818'}, style]}>
        {children}
      </View>
    </View>
  );
}

// ── INSERT COIN blink ─────────────────────────────────────────────────
function Blink({text, style}) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(op, {toValue: 0, duration: 500, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 500, useNativeDriver: true}),
    ])).start();
  }, []);
  return <Animated.Text style={[style, {opacity: op}]}>{text}</Animated.Text>;
}

// ── Perspective stage floor ───────────────────────────────────────────
function Floor() {
  const lines = [0, 6, 14, 25, 39, 57, 80, 108];
  return (
    <View style={st.floorWrap} pointerEvents="none">
      <View style={st.horizon} />
      {lines.map((top, i) => (
        <View key={i} style={[st.floorLine, {top, opacity: 0.22 + i * 0.08}]} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 1 — BOOT (INSERT COIN / PRESS START)
// ═══════════════════════════════════════════════════════════════════════
function BootScreen({onDone}) {
  const btnScale = useRef(new Animated.Value(1)).current;
  const glowOp   = useRef(new Animated.Value(0.7)).current;
  const flash    = useRef(new Animated.Value(0)).current;
  const tapped   = useRef(false);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowOp, {toValue: 1,    duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(glowOp, {toValue: 0.65, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
  }, []);

  function go() {
    if (tapped.current) return;
    tapped.current = true;
    Animated.sequence([
      Animated.spring(btnScale, {toValue: 0.93, tension: 400, friction: 5, useNativeDriver: true}),
      Animated.timing(flash, {toValue: 1, duration: 55, useNativeDriver: true}),
      Animated.timing(flash, {toValue: 0, duration: 280, useNativeDriver: true}),
    ]).start(() => onDone());
  }

  return (
    // Plain View — AuthScreen root already wraps in SafeAreaView
    <View style={st.fill}>
      <Floor />

      {/* Step label */}
      <View style={st.topBar}>
        <Text style={st.stepLabel}>1 · BOOT</Text>
      </View>

      {/* Centred logo */}
      <View style={st.bootCenter}>
        <Text style={st.logoStreak}>STREAK</Text>

        {/*
          Chromatic FIGHT: 3 layers all absolute + width:'100%' + textAlign:'center'
          Shifting left/right via the `left` prop offsets the text block while
          keeping the text itself centred — gives the chromatic aberration look.
        */}
        <View style={st.fightBox}>
          <Text style={[st.logoFight, st.abs, {color: C.cyan,  left: -6, opacity: 0.8}]}>FIGHT</Text>
          <Text style={[st.logoFight, st.abs, {color: C.pink,  left:  6, opacity: 0.8}]}>FIGHT</Text>
          <Text style={[st.logoFight, st.abs, {color: '#fff',  left:  0}]}>FIGHT</Text>
        </View>

        <Text style={st.roundLabel}>· ROUND 1 ·</Text>
      </View>

      {/* INSERT COIN + PRESS START */}
      <View style={st.bootBottom}>
        <Blink text="INSERT COIN" style={st.insertCoin} />
        <View style={{marginTop: 20}}>
          <Animated.View style={{transform: [{scale: btnScale}]}}>
            <TouchableOpacity onPress={go} activeOpacity={1}>
              <View style={st.startShadow} />
              <Animated.View style={[st.startBtn, {opacity: glowOp.interpolate({
                inputRange: [0.65, 1], outputRange: [0.88, 1],
              })}]}>
                <Text style={st.startTxt}>PRESS START</Text>
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* CRT white flash */}
      <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill, {backgroundColor: '#fff', opacity: flash}]} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 2 — SELECT YOUR FIGHTER
// ═══════════════════════════════════════════════════════════════════════
function SelectScreen({onNew, onContinue}) {
  const slideY = useRef(new Animated.Value(24)).current;
  const op     = useRef(new Animated.Value(0)).current;
  const [count, setCount] = useState(9);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {toValue: 0, tension: 65, friction: 10, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
    const id = setInterval(() => setCount(n => n > 1 ? n - 1 : 9), 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={[st.fill, {opacity: op, transform: [{translateY: slideY}]}]}>
      {/* Breadcrumb nav */}
      <View style={st.topBar}>
        <Text style={st.stepLabel}>1 · BOOT</Text>
        <Text style={[st.stepLabel, {color: '#fff'}]}>{'  '}2 · SELECT</Text>
        <Text style={st.stepLabel}>{'  '}3 · CREATE</Text>
        <Text style={st.stepLabel}>{'  '}4 · REWARD</Text>
      </View>

      <ScrollView style={{flex: 1}} contentContainerStyle={st.screenPad} showsVerticalScrollIndicator={false}>
        <Text style={st.screenTitle}>SELECT YOUR{'\n'}FIGHTER</Text>
        <Text style={st.screenSub}>Your squad sees every skip.</Text>

        {/* Online badge */}
        <View style={st.badge}>
          <View style={st.badgeDot} />
          <Text style={st.badgeTxt}>4 fighters online</Text>
        </View>

        {/* NEW CHALLENGER */}
        <TouchableOpacity activeOpacity={0.82} onPress={onNew} style={{marginBottom: 14}}>
          <HardCard borderColor={C.pink} shadowColor="rgba(255,0,112,0.38)">
            <View style={st.selectorCard}>
              <View style={{flex: 1}}>
                <Text style={[st.cardTitle, {color: C.pink}]}>NEW CHALLENGER</Text>
                <Text style={st.cardSub}>Create a fighter & enter the arena</Text>
              </View>
              <Text style={[st.cardArrow, {color: C.pink}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>

        {/* CONTINUE? */}
        <TouchableOpacity activeOpacity={0.82} onPress={onContinue}>
          <HardCard borderColor={C.cyan} shadowColor="rgba(0,229,255,0.28)">
            <View style={st.selectorCard}>
              <View style={{flex: 1}}>
                <Text style={[st.cardTitle, {color: C.cyan}]}>CONTINUE?</Text>
                <Text style={st.cardSub}>Resume your streak</Text>
                <Text style={[st.cardCount, {color: C.yellow}]}>{count}</Text>
              </View>
              <Text style={[st.cardArrow, {color: C.cyan}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>
      </ScrollView>

      {/* RANK PATH strip */}
      <View style={st.rankPanel}>
        <Text style={st.rankHdr}>RANK → PATH TO GRANDMASTER</Text>
        <View style={st.rankRow}>
          <View style={st.rankConnector} />
          {RANK_LABELS.map((r, i) => (
            <View key={r} style={st.rankSlot}>
              <View style={[st.diamond, i === 0 && st.diamondActive]}>
                <Text style={[st.diamondIcon, {color: i === 0 ? C.yellow : 'rgba(255,255,255,0.22)'}]}>★</Text>
              </View>
              <Text style={[st.rankLbl, {color: i === 0 ? C.yellow : 'rgba(255,255,255,0.32)'}]}>{r}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 3 — CREATE FIGHTER (SIGNUP)
// ═══════════════════════════════════════════════════════════════════════
function CreateScreen({onBack, signup}) {
  const slideY   = useRef(new Animated.Value(24)).current;
  const op       = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [color,      setColor]      = useState('pink');
  const [loading,    setLoading]    = useState(false);
  const [nameStatus, setNameStatus] = useState(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {toValue: 0, tension: 65, friction: 10, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const checkName = useCallback((val) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val || val.length < 2) { setNameStatus(null); return; }
    setNameStatus('checking');
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(endpoints.checkUsername(val));
        const j = await r.json();
        setNameStatus(j.available ? 'available' : 'taken');
      } catch { setNameStatus(null); }
    }, 500);
  }, []);

  async function submit() {
    if (!name)                     { Alert.alert('Required', 'Pick a fighter name'); return; }
    if (nameStatus === 'taken')    { Alert.alert('Name Taken', 'Choose a different name.'); return; }
    if (nameStatus === 'checking') { Alert.alert('Wait', 'Checking name…'); return; }
    if (!email)                    { Alert.alert('Required', 'Enter your email'); return; }
    if (!password)                 { Alert.alert('Required', 'Choose a password'); return; }
    setLoading(true);
    try {
      await signup(email, password, name, color);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('Try logging in')) {
        Alert.alert('Already Registered', 'That email has an account. Log in?', [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Log In', onPress: onBack},
        ]);
      } else {
        Alert.alert('Signup Failed', msg);
      }
    } finally { setLoading(false); }
  }

  const emblemColor = COLORS.find(c => c.key === color)?.hex || C.pink;
  const initial = name ? name[0].toUpperCase() : '?';

  return (
    <Animated.View style={[st.fill, {opacity: op, transform: [{translateY: slideY}]}]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <View style={st.topBar}>
          <TouchableOpacity onPress={onBack}>
            <Text style={st.stepLabel}>◀ BACK</Text>
          </TouchableOpacity>
          <Text style={[st.stepLabel, {color: '#fff'}]}>{'  '}3 · CREATE FIGHTER</Text>
        </View>

        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* YOU VS SKIP */}
          <View style={st.vsRow}>
            <Text style={[st.vsWord, {color: C.cyan}]}>YOU</Text>
            <Text style={st.vsBig}>VS</Text>
            <Text style={[st.vsWord, {color: C.pink}]}>SKIP</Text>
          </View>

          {/* Single dossier card containing emblem, swatches, fields, button */}
          <HardCard borderColor={C.pink} shadowColor="rgba(255,0,112,0.28)">
            <View style={st.dossierPad}>
              {/* Top row: emblem + name/swatches */}
              <View style={st.idRow}>
                <View style={[st.emblem, {borderColor: emblemColor}]}>
                  <Text style={[st.emblemLetter, {color: emblemColor}]}>{initial}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0, marginLeft: 12}}>
                  <TextInput
                    style={[
                      st.nameField,
                      nameStatus === 'available' && {borderBottomColor: C.lime},
                      nameStatus === 'taken'     && {borderBottomColor: C.red},
                    ]}
                    placeholder="FIGHTER NAME"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={name}
                    onChangeText={v => { setName(v); checkName(v); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                  {nameStatus === 'checking'  && <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={{alignSelf: 'flex-start', marginTop: 4}} />}
                  {nameStatus === 'available' && <Text style={[st.nameStatus, {color: C.lime}]}>✓ AVAILABLE</Text>}
                  {nameStatus === 'taken'     && <Text style={[st.nameStatus, {color: C.red}]}>✗ TAKEN</Text>}
                  <View style={st.swatches}>
                    {COLORS.map(c => (
                      <TouchableOpacity
                        key={c.key} onPress={() => setColor(c.key)} activeOpacity={0.7}
                        style={[st.swatch, {backgroundColor: c.hex}, color === c.key && st.swatchOn]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              {/* ACCOUNT divider */}
              <View style={st.divider}>
                <View style={st.divLine} />
                <Text style={st.divTxt}>ACCOUNT</Text>
                <View style={st.divLine} />
              </View>

              <TextInput
                style={st.credField}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[st.credField, {marginBottom: 0}]}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                onPress={submit} disabled={loading} activeOpacity={0.85}
                style={[st.fightBtn, loading && {opacity: 0.55}]}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={st.fightBtnTxt}>FIGHT! ▶</Text>}
              </TouchableOpacity>
            </View>
          </HardCard>

          <TouchableOpacity onPress={onBack} style={st.switchRow}>
            <Text style={st.switchTxt}>Already fighting? <Text style={{color: C.cyan}}>CONTINUE</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 4 — CONTINUE (LOGIN)
// ═══════════════════════════════════════════════════════════════════════
function ContinueScreen({onBack, login}) {
  const slideY   = useRef(new Animated.Value(24)).current;
  const op       = useRef(new Animated.Value(0)).current;
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {toValue: 0, tension: 65, friction: 10, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
  }, []);

  async function submit() {
    if (!email || !password) { Alert.alert('Required', 'Enter your email and password'); return; }
    setLoading(true);
    try { await login(email, password); }
    catch (e) { Alert.alert('Login Failed', e.message); }
    finally { setLoading(false); }
  }

  return (
    <Animated.View style={[st.fill, {opacity: op, transform: [{translateY: slideY}]}]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <View style={st.topBar}>
          <TouchableOpacity onPress={onBack}>
            <Text style={st.stepLabel}>◀ BACK</Text>
          </TouchableOpacity>
          <Text style={[st.stepLabel, {color: '#fff'}]}>{'  '}CONTINUE?</Text>
        </View>
        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={st.screenTitle}>WELCOME{'\n'}BACK.</Text>
          <Text style={st.screenSub}>Your streak is waiting.</Text>

          <HardCard borderColor={C.cyan} shadowColor="rgba(0,229,255,0.28)" style={{marginTop: 8}}>
            <View style={st.dossierPad}>
              <TextInput
                style={[st.credField, {borderColor: 'rgba(0,229,255,0.4)'}]}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[st.credField, {marginBottom: 0, borderColor: 'rgba(0,229,255,0.4)'}]}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                onPress={submit} disabled={loading} activeOpacity={0.85}
                style={[st.fightBtn, {backgroundColor: C.cyan, shadowColor: C.cyan}, loading && {opacity: 0.55}]}
              >
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={st.fightBtnTxt}>LOG IN ▶</Text>}
              </TouchableOpacity>
            </View>
          </HardCard>

          <TouchableOpacity onPress={onBack} style={st.switchRow}>
            <Text style={st.switchTxt}>New here? <Text style={{color: C.pink}}>NEW CHALLENGER</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════
export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [phase, setPhase] = useState('boot');

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      {phase === 'boot'     && <BootScreen     onDone={() => setPhase('select')} />}
      {phase === 'select'   && <SelectScreen   onNew={() => setPhase('create')} onContinue={() => setPhase('continue')} />}
      {phase === 'create'   && <CreateScreen   onBack={() => setPhase('select')} signup={signup} />}
      {phase === 'continue' && <ContinueScreen onBack={() => setPhase('select')} login={login} />}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bgDeep},
  fill: {flex: 1},

  // ── Floor ──────────────────────────────────────────────────────────
  floorWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
    overflow: 'hidden',
  },
  horizon: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: C.cyan,
    shadowColor: C.cyan, shadowOpacity: 1, shadowRadius: 14,
    shadowOffset: {width: 0, height: 0}, elevation: 6,
  },
  floorLine: {
    position: 'absolute', left: 0, right: 0, height: 1.5,
    backgroundColor: C.cyan,
  },

  // ── Nav bar ────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row', flexWrap: 'nowrap',
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10,
  },
  stepLabel: {
    fontFamily: PIXEL, fontSize: 7,
    color: 'rgba(0,229,255,0.5)', letterSpacing: 0.5,
  },

  // ── Boot ───────────────────────────────────────────────────────────
  bootCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 50,
  },
  logoStreak: {
    fontFamily: PIXEL, fontSize: 36, color: C.yellow,
    letterSpacing: 2, marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 5, height: 5}, textShadowRadius: 0,
  },
  // FIGHT container: full width so absolute layers align by textAlign:center
  fightBox: {width: '100%', height: 50, marginBottom: 16},
  logoFight: {
    fontFamily: PIXEL, fontSize: 36, color: '#fff',
    textAlign: 'center', letterSpacing: 2,
  },
  abs: {position: 'absolute', width: '100%'},
  roundLabel: {
    fontFamily: PIXEL, fontSize: 9, color: C.cyan, letterSpacing: 3,
  },
  bootBottom: {alignItems: 'center', paddingBottom: 150},
  insertCoin: {fontFamily: PIXEL, fontSize: 10, color: C.lime, letterSpacing: 2},
  startShadow: {
    position: 'absolute', top: 6, left: 0, right: -6, bottom: -6,
    backgroundColor: C.pink,
  },
  startBtn: {
    backgroundColor: C.yellow, borderWidth: 3, borderColor: '#fff',
    paddingHorizontal: 26, paddingVertical: 15,
  },
  startTxt: {fontFamily: PIXEL, fontSize: 13, color: C.bgDeep, letterSpacing: 1},

  // ── Shared ─────────────────────────────────────────────────────────
  screenPad: {paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24},
  screenTitle: {
    fontFamily: PIXEL, fontSize: 14, color: '#fff',
    lineHeight: 24, marginTop: 8, marginBottom: 8,
    textShadowColor: C.pink, textShadowRadius: 0,
    textShadowOffset: {width: 2, height: 2},
  },
  screenSub: {
    fontSize: 13, fontWeight: '600',
    color: 'rgba(255,255,255,0.7)', marginBottom: 14,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 16,
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: C.lime,
    shadowColor: C.lime, shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  badgeTxt: {fontSize: 12, fontWeight: '700', color: '#fff'},

  // ── Selector cards ─────────────────────────────────────────────────
  selectorCard: {flexDirection: 'row', alignItems: 'center', padding: 16, paddingRight: 12},
  cardTitle:    {fontFamily: PIXEL, fontSize: 10, marginBottom: 8},
  cardSub:      {fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)'},
  cardCount:    {fontFamily: PIXEL, fontSize: 18, marginTop: 6, letterSpacing: 4},
  cardArrow:    {fontFamily: PIXEL, fontSize: 14, marginLeft: 8},

  // ── Rank strip ─────────────────────────────────────────────────────
  rankPanel: {
    borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#0b0716',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  rankHdr: {
    fontFamily: PIXEL, fontSize: 7,
    color: 'rgba(255,255,255,0.45)', letterSpacing: 1, marginBottom: 14,
  },
  rankRow: {
    flexDirection: 'row', justifyContent: 'space-between', position: 'relative',
  },
  rankConnector: {
    position: 'absolute', left: '10%', right: '10%', top: 19,
    height: 2, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  rankSlot: {alignItems: 'center', flex: 1},
  diamond: {
    width: 38, height: 38, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    transform: [{rotate: '45deg'}],
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bgDeep, marginBottom: 6,
  },
  diamondActive: {
    borderColor: C.yellow, backgroundColor: 'rgba(255,224,0,0.15)',
    shadowColor: C.yellow, shadowOpacity: 0.65, shadowRadius: 14,
    shadowOffset: {width: 0, height: 0}, elevation: 8,
  },
  diamondIcon: {fontSize: 13, transform: [{rotate: '-45deg'}]},
  rankLbl: {fontFamily: PIXEL, fontSize: 5, letterSpacing: 0.5, textAlign: 'center'},

  // ── VS header ──────────────────────────────────────────────────────
  vsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginTop: 10, marginBottom: 18,
  },
  vsWord: {fontFamily: PIXEL, fontSize: 11},
  vsBig: {
    fontFamily: PIXEL, fontSize: 22, color: '#fff',
    textShadowColor: C.pink, textShadowRadius: 0,
    textShadowOffset: {width: 3, height: 3},
    transform: [{skewX: '-8deg'}],
  },

  // ── Dossier card ───────────────────────────────────────────────────
  dossierPad: {padding: 16},
  idRow: {flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start'},
  emblem: {
    width: 58, height: 58, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emblemLetter: {fontFamily: PIXEL, fontSize: 22},
  nameField: {
    fontFamily: PIXEL, fontSize: 10, color: '#fff',
    borderBottomWidth: 2, borderBottomColor: C.pink,
    paddingBottom: 4, marginBottom: 6,
  },
  nameStatus: {fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6},
  swatches:   {flexDirection: 'row', gap: 8, marginTop: 4},
  swatch:     {width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)'},
  swatchOn:   {borderColor: '#fff'},

  divider: {flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16},
  divLine: {flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.18)'},
  divTxt:  {fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 2},

  credField: {
    backgroundColor: '#080612',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12, paddingVertical: 13,
    color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 12,
  },

  fightBtn: {
    backgroundColor: C.pink, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
    shadowColor: C.pink, shadowOpacity: 0.5, shadowRadius: 20,
    shadowOffset: {width: 0, height: 4}, elevation: 10,
  },
  fightBtnTxt: {fontFamily: PIXEL, fontSize: 13, color: '#000', letterSpacing: 1},

  switchRow: {alignItems: 'center', marginTop: 18},
  switchTxt: {fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)'},
});
