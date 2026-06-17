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

const RANK_DATA = [
  {label: 'ROOKIE',  state: 'done'},
  {label: 'FIGHTER', state: 'cur'},
  {label: 'CHAMP',   state: 'lock'},
  {label: 'MASTER',  state: 'lock'},
];

// ── Hard pixel-art drop-shadow card (absolutely-positioned shadow layer) ──
function HardCard({borderColor, shadowColor, children, style}) {
  return (
    <View style={{marginBottom: 8}}>
      <View style={[StyleSheet.absoluteFill, {
        top: 5, left: 0, right: -5, bottom: -5,
        backgroundColor: shadowColor,
      }]} />
      <View style={[{borderWidth: 2, borderColor, backgroundColor: '#160f1e'}, style]}>
        {children}
      </View>
    </View>
  );
}

// ── Blink animation ───────────────────────────────────────────────────
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
// Horizontal lines at increasing gaps + vertical lines that converge at
// a vanishing point on the horizon (achieved by rotating long lines
// around their centre, which sits exactly at the horizon).
function Floor() {
  const H_LINES = [0, 6, 14, 25, 39, 57, 80, 108];
  // Angles for vertical perspective lines (° from centre)
  const V_ANGLES = [-55, -40, -28, -15, 0, 15, 28, 40, 55];
  const V_TALL = 700;

  return (
    <View style={st.floorWrap} pointerEvents="none">
      {/* Stage ambient glow above horizon */}
      <View style={st.stageGlow} />
      <View style={st.horizon} />

      {/* Vertical lines converging at the vanishing point on the horizon.
          Each line is V_TALL px tall, centred at the horizon (top: -V_TALL/2),
          then rotated around its own centre — which sits on the horizon line.
          overflow:'hidden' on floorWrap clips the above-horizon half. */}
      {V_ANGLES.map((angle, i) => (
        <View key={`v${i}`} style={{
          position: 'absolute',
          top: -V_TALL / 2,
          left: '50%',
          marginLeft: -0.75,
          width: 1.5,
          height: V_TALL,
          backgroundColor: C.cyan,
          opacity: angle === 0 ? 0.28 : 0.42,
          transform: [{rotate: `${angle}deg`}],
        }} />
      ))}

      {/* Horizontal scanlines */}
      {H_LINES.map((top, i) => (
        <View key={`h${i}`} style={[st.floorLine, {top, opacity: 0.22 + i * 0.09}]} />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN 1 — BOOT
// ═══════════════════════════════════════════════════════════════════════
function BootScreen({onDone}) {
  const btnScale = useRef(new Animated.Value(1)).current;
  const glowOp   = useRef(new Animated.Value(0.65)).current;
  const flash    = useRef(new Animated.Value(0)).current;
  const tapped   = useRef(false);

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(glowOp, {toValue: 1,    duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(glowOp, {toValue: 0.65, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
  }, []);

  function go() {
    if (tapped.current) return;
    tapped.current = true;
    Animated.sequence([
      Animated.spring(btnScale, {toValue: 0.93, tension: 400, friction: 5, useNativeDriver: true}),
      Animated.timing(flash, {toValue: 1, duration: 55, useNativeDriver: true}),
      Animated.timing(flash, {toValue: 0, duration: 300, useNativeDriver: true}),
    ]).start(() => onDone());
  }

  return (
    <View style={st.fill}>
      <Floor />

      {/* Topbar: 1P · CREDIT 99 · CPU */}
      <View style={st.topBar}>
        <Text style={st.tbCyan}>1P</Text>
        <Text style={st.tbYellow}>CREDIT 99</Text>
        <Text style={st.tbCyan}>CPU</Text>
      </View>

      {/* Logo */}
      <View style={st.bootCenter}>
        <Text style={st.logoStreak}>STREAK</Text>

        {/* Chromatic FIGHT — 3 layers all absolute+full-width so textAlign:'center'
            centres the text; left offset shifts the block for the aberration effect */}
        <View style={st.fightBox}>
          <Text style={[st.logoFight, st.absText, {color: C.cyan,  left: -4, opacity: 0.8}]}>FIGHT</Text>
          <Text style={[st.logoFight, st.absText, {color: C.pink,  left:  4, opacity: 0.8}]}>FIGHT</Text>
          <Text style={[st.logoFight, st.absText, {color: '#fff',  left:  0}]}>FIGHT</Text>
        </View>

        <Text style={st.roundLabel}>{'▸ ROUND 1 ◂'}</Text>
      </View>

      {/* INSERT COIN + PRESS START */}
      <View style={st.bootBottom}>
        <Blink text="INSERT COIN" style={st.insertCoin} />
        <View style={{marginTop: 18}}>
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

      {/* CRT white flash on tap */}
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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {toValue: 0, tension: 65, friction: 10, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <Animated.View style={[st.fill, {opacity: op, transform: [{translateY: slideY}]}]}>
      {/* Topbar: 1P · HI-SCORE */}
      <View style={st.topBar}>
        <Text style={st.tbCyan}>1P</Text>
        <Text style={st.tbYellow}>HI-SCORE 24</Text>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={[st.screenPad, st.selectPad]}
        showsVerticalScrollIndicator={false}>
        <Text style={st.screenTitle}>SELECT YOUR{'\n'}FIGHTER</Text>
        <Text style={st.screenSub}>Your squad sees every skip.</Text>

        <View style={st.squad}>
          <View style={st.squadDot} />
          <Text style={st.squadTxt}>4 fighters online</Text>
        </View>

        {/* NEW CHALLENGER — hard-shadow card */}
        <TouchableOpacity activeOpacity={0.82} onPress={onNew}>
          <HardCard borderColor={C.pink} shadowColor="rgba(255,45,111,0.38)">
            <View style={st.selectorRow}>
              <View style={{flex: 1}}>
                <Text style={[st.cardKey, {color: C.pink}]}>NEW CHALLENGER</Text>
                <Text style={st.cardDesc}>Create a fighter &amp; enter the arena</Text>
              </View>
              <Text style={[st.cardArrow, {color: C.pink}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>

        {/* CONTINUE? — hard-shadow card with "9  8  7" countdown */}
        <TouchableOpacity activeOpacity={0.82} onPress={onContinue}>
          <HardCard borderColor={C.cyan} shadowColor="rgba(25,224,255,0.30)">
            <View style={st.selectorRow}>
              <View style={{flex: 1}}>
                <Text style={[st.cardKey, {color: C.cyan}]}>CONTINUE?</Text>
                <Text style={st.cardDesc}>Resume your streak</Text>
                {/* Static "9  8  7" decorative countdown — matches proto4 */}
                <Text style={st.cardCount}>{'9  8  7'}</Text>
              </View>
              <Text style={[st.cardArrow, {color: C.cyan}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>

        {/* RANK PANEL */}
        <View style={[st.rankPanel, st.selectRankPanel]}>
          <Text style={st.rankHdr}>
            RANK {'▶'} <Text style={{color: C.yellow}}>PATH TO GRANDMASTER</Text>
          </Text>
          <View style={st.rankRow}>
            <View style={st.rankConnector} />
            {RANK_DATA.map(({label, state}) => {
              const isDone = state === 'done';
              const isCur  = state === 'cur';
              const col    = isDone ? C.lime : isCur ? C.yellow : 'rgba(255,255,255,0.28)';
              const bgMed  = isDone ? 'rgba(155,232,12,0.18)' : isCur ? 'rgba(255,212,0,0.25)' : C.bgDeep;
              const sz     = isCur ? 48 : 40;
              return (
                <View key={label} style={st.rankSlot}>
                  <View style={[st.medal, {
                    width: sz, height: sz,
                    borderColor: col, backgroundColor: bgMed,
                    ...(isCur ? {
                      shadowColor: C.yellow, shadowOpacity: 0.8,
                      shadowRadius: 20, shadowOffset: {width: 0, height: 0}, elevation: 8,
                    } : {}),
                  }]}>
                    <Text style={[st.medalIcon, {color: col}]}>
                      {state === 'lock' ? '◆' : '★'}
                    </Text>
                  </View>
                  <Text style={[st.rankLbl, {color: col}]}>{label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      
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
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus,  setPassFocus]  = useState(false);

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
        {/* Topbar: ◀ BACK · NEW FIGHTER */}
        <View style={st.topBar}>
          <TouchableOpacity onPress={onBack}>
            <Text style={st.tbCyan}>{'◀'} BACK</Text>
          </TouchableOpacity>
          <Text style={st.tbYellow}>NEW FIGHTER</Text>
        </View>

        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* YOU VS SKIP — chromatic VS using 3 absolutely positioned layers */}
          <View style={st.vsRow}>
            <Text style={[st.vsWord, {color: C.cyan}]}>YOU</Text>
            <View style={st.vsBox}>
              <Text style={[st.vsBig, st.absText, {color: C.pink, left: 3, top: 3, opacity: 0.75}]}>VS</Text>
              <Text style={[st.vsBig, st.absText, {color: C.cyan, left: -3, top: -3, opacity: 0.75}]}>VS</Text>
              <Text style={[st.vsBig, st.absText, {color: '#fff', left: 0, top: 0}]}>VS</Text>
            </View>
            <Text style={[st.vsWord, {color: C.pink}]}>SKIP</Text>
          </View>

          {/* Dossier card */}
          <HardCard borderColor={C.pink} shadowColor="rgba(255,45,111,0.30)">
            <View style={{padding: 15}}>
              {/* Emblem + name row */}
              <View style={st.idRow}>
                <View style={[st.emblem, {
                  borderColor: emblemColor,
                  shadowColor: emblemColor,
                  shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: {width: 0, height: 0},
                }]}>
                  <Text style={[st.emblemLetter, {color: emblemColor}]}>{initial}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0, marginLeft: 14}}>
                  <TextInput
                    style={[
                      st.nameField,
                      nameStatus === 'available' && {borderBottomColor: C.lime},
                      nameStatus === 'taken'     && {borderBottomColor: '#ff4444'},
                    ]}
                    placeholder="FIGHTER NAME"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={name}
                    onChangeText={v => { setName(v); checkName(v); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                  {nameStatus === 'checking'  && <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={{alignSelf:'flex-start',marginTop:4}} />}
                  {nameStatus === 'available' && <Text style={[st.nameStatus, {color: C.lime}]}>✓ AVAILABLE</Text>}
                  {nameStatus === 'taken'     && <Text style={[st.nameStatus, {color:'#ff4444'}]}>✗ TAKEN</Text>}
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
              <View style={st.divRow}>
                <View style={st.divLine} />
                <Text style={st.divTxt}>Account</Text>
                <View style={st.divLine} />
              </View>

              <Text style={st.fldLabel}>Email</Text>
              <TextInput
                style={[st.credField, emailFocus && {borderColor: 'rgba(25,224,255,0.5)'}]}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
              />

              <Text style={st.fldLabel}>Password</Text>
              <TextInput
                style={[st.credField, {marginBottom: 0}, passFocus && {borderColor: 'rgba(25,224,255,0.5)'}]}
                placeholder="min 8 characters"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
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
            <Text style={st.switchTxt}>Already fighting? <Text style={{color: '#19E0FF', fontFamily: 'Oswald-Bold'}}>CONTINUE</Text></Text>
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
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password,    setPassword]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [uFocus,      setUFocus]      = useState(false);
  const [pFocus,      setPFocus]      = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY, {toValue: 0, tension: 65, friction: 10, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
  }, []);

  async function submit() {
    if (!emailOrUser || !password) { Alert.alert('Required', 'Enter your email or username and password'); return; }
    setLoading(true);
    try { await login(emailOrUser, password); }
    catch (e) { Alert.alert('Login Failed', e.message); }
    finally { setLoading(false); }
  }

  return (
    <Animated.View style={[st.fill, {opacity: op, transform: [{translateY: slideY}]}]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        {/* Topbar: ◀ BACK · CONTINUE? */}
        <View style={st.topBar}>
          <TouchableOpacity onPress={onBack}>
            <Text style={st.tbCyan}>{'◀'} BACK</Text>
          </TouchableOpacity>
          <Text style={st.tbYellow}>CONTINUE?</Text>
        </View>

        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={st.screenTitle}>WELCOME{'\n'}BACK.</Text>
          <Text style={st.screenSub}>Your streak is waiting.</Text>

          <HardCard borderColor={C.cyan} shadowColor="rgba(25,224,255,0.28)">
            <View style={{padding: 15}}>
              <Text style={st.fldLabel}>Email or Username</Text>
              <TextInput
                style={[st.credField, {borderColor: uFocus ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.22)'}]}
                placeholder="you@example.com or fighter_name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={emailOrUser}
                onChangeText={setEmailOrUser}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setUFocus(true)}
                onBlur={() => setUFocus(false)}
              />

              <Text style={st.fldLabel}>Password</Text>
              <TextInput
                style={[st.credField, {marginBottom: 0, borderColor: pFocus ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.22)'}]}
                placeholder="your password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setPFocus(true)}
                onBlur={() => setPFocus(false)}
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
            <Text style={st.switchTxt}>New here? <Text style={{color: '#FF2D6F', fontFamily: 'Oswald-Bold'}}>NEW CHALLENGER</Text></Text>
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

  // ── CRT vignette ──────────────────────────────────────────────────────
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 72,
    borderColor: 'rgba(0,0,0,0.65)',
    zIndex: 50,
  },

  // ── Floor ─────────────────────────────────────────────────────────────
  floorWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 170,
    overflow: 'hidden',
  },
  stageGlow: {
    position: 'absolute',
    bottom: 90, alignSelf: 'center',
    width: 280, height: 160,
    borderRadius: 140,
    backgroundColor: 'rgba(25,224,255,0.09)',
    shadowColor: C.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 55,
    shadowOffset: {width: 0, height: 0},
  },
  horizon: {
    position: 'absolute', top: 0, left: '6%', right: '6%', height: 2,
    backgroundColor: C.cyan,
    shadowColor: C.cyan, shadowOpacity: 1, shadowRadius: 22,
    shadowOffset: {width: 0, height: 0},
  },
  floorLine: {
    position: 'absolute', left: 0, right: 0, height: 1.5,
    backgroundColor: C.cyan,
  },

  // ── Topbar ────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
  },
  tbCyan:   {fontFamily: PIXEL, fontSize: 7, color: '#19E0FF', letterSpacing: 1},
  tbYellow: {fontFamily: PIXEL, fontSize: 7, color: '#FFD400', letterSpacing: 1},

  // ── Boot logo ─────────────────────────────────────────────────────────
  bootCenter: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingBottom: 60,
  },
  logoStreak: {
    fontFamily: PIXEL, fontSize: 42, color: '#FFD400',
    letterSpacing: 2,
    textShadowColor: '#05030a',
    textShadowOffset: {width: 4, height: 4},
    textShadowRadius: 0,
  },
  fightBox: {width: '100%', height: 58, marginTop: 6, marginBottom: 22},
  logoFight: {
    fontFamily: PIXEL, fontSize: 42, color: '#fff',
    textAlign: 'center', letterSpacing: 2,
  },
  absText: {position: 'absolute', width: '100%'},
  roundLabel: {
    fontFamily: PIXEL, fontSize: 9, color: C.cyan, letterSpacing: 2,
  },
  bootBottom: {
    position: 'absolute', bottom: 190, left: 0, right: 0,
    alignItems: 'center',
  },
  insertCoin: {
    fontFamily: 'Oswald-Bold', fontSize: 11, color: '#9BE80C',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  startShadow: {
    position: 'absolute', top: 6, left: 0, right: -6, bottom: -6,
    backgroundColor: '#FF2D6F',
  },
  startBtn: {
    backgroundColor: '#FFD400', borderWidth: 3, borderColor: '#fff',
    paddingHorizontal: 26, paddingVertical: 16,
    shadowColor: '#FF2D6F', shadowOpacity: 0.9, shadowRadius: 0,
    shadowOffset: {width: 6, height: 6}, elevation: 0,
  },
  startTxt: {fontFamily: PIXEL, fontSize: 14, color: C.bgDeep, letterSpacing: 1},

  // ── Shared screen ─────────────────────────────────────────────────────
  screenPad: {paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24},
  selectPad: {flexGrow: 1, paddingBottom: 34},
  screenTitle: {
    fontFamily: PIXEL, fontSize: 13, color: '#fff',
    lineHeight: 22, marginTop: 8, marginBottom: 6,
    textShadowColor: '#FF2D6F', textShadowOffset: {width: 2, height: 2}, textShadowRadius: 0,
  },
  screenSub: {
    fontSize: 13, fontFamily: 'Oswald-SemiBold',
    color: 'rgba(255,255,255,0.80)', marginBottom: 14,
  },

  // ── Online badge ──────────────────────────────────────────────────────
  squad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 16,
  },
  squadDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: C.lime,
    shadowColor: C.lime, shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  squadTxt: {fontSize: 12, fontFamily: 'Oswald-Bold', color: '#fff'},

  // ── Selector card internals ───────────────────────────────────────────
  selectorRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingRight: 12,
  },
  cardKey:   {fontFamily: PIXEL, fontSize: 11, marginBottom: 8},
  cardDesc:  {fontSize: 13, fontFamily: 'Oswald-SemiBold', color: 'rgba(255,255,255,0.80)'},
  cardCount: {fontFamily: PIXEL, fontSize: 13, color: C.yellow, marginTop: 8, letterSpacing: 4},
  cardArrow: {fontFamily: PIXEL, fontSize: 13},

  // ── Rank panel ────────────────────────────────────────────────────────
  rankPanel: {
    marginTop: 4,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: '#0e0916',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  selectRankPanel: {
    marginTop: 'auto',
    marginBottom: 10,
  },
  rankHdr: {
    fontSize: 10, fontFamily: 'Oswald-Bold',
    color: 'rgba(255,255,255,0.80)',
    textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 17,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'relative',
    gap: 12,
  },
  rankConnector: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 20,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rankSlot: {alignItems: 'center', width: 52},
  medal: {
    width: 40, height: 40, borderWidth: 2,
    transform: [{rotate: '45deg'}],
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  medalIcon: {
    fontFamily: PIXEL,
    fontSize: 12,
    lineHeight: 16,
    transform: [{rotate: '-45deg'}],
  },
  rankLbl: {
    fontSize: 9,
    fontFamily: 'Oswald-Bold',
    letterSpacing: 0.5,
    textAlign: 'center', textTransform: 'uppercase',
  },

  // ── YOU VS SKIP header ────────────────────────────────────────────────
  vsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 14, marginTop: 12, marginBottom: 14,
  },
  vsWord: {fontFamily: PIXEL, fontSize: 10},
  vsBox: {width: 70, height: 36},
  vsBig: {
    fontFamily: PIXEL, fontSize: 22, color: '#fff',
    textAlign: 'center', width: '100%',
    transform: [{skewX: '-8deg'}],
  },

  // ── Dossier card internals ────────────────────────────────────────────
  idRow:        {flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start'},
  emblem: {
    width: 58, height: 58, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emblemLetter: {fontFamily: PIXEL, fontSize: 26},
  nameField: {
    fontFamily: PIXEL, fontSize: 11, color: '#fff',
    borderBottomWidth: 2, borderBottomColor: C.pink,
    paddingBottom: 4, marginBottom: 6,
  },
  nameStatus: {fontSize: 9, fontFamily: 'Oswald-Bold', letterSpacing: 1, marginBottom: 6},
  swatches:   {flexDirection: 'row', gap: 8, marginTop: 8},
  swatch:     {width: 19, height: 19, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'},
  swatchOn:   {borderColor: '#fff'},

  divRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14},
  divLine: {flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)'},
  divTxt:  {
    fontSize: 10, fontFamily: 'Oswald-Bold',
    color: 'rgba(255,255,255,0.67)', letterSpacing: 2, textTransform: 'uppercase',
  },

  // ── Field labels + inputs ─────────────────────────────────────────────
  fldLabel: {
    fontSize: 10, fontFamily: 'Oswald-Bold',
    color: 'rgba(255,255,255,0.70)',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  credField: {
    backgroundColor: '#0b0712',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 11, paddingVertical: 11,
    color: '#fff', fontSize: 14, fontFamily: 'Oswald-SemiBold',
    letterSpacing: 0.5, marginBottom: 16,
  },

  fightBtn: {
    backgroundColor: '#FF2D6F', borderWidth: 3, borderColor: '#fff',
    paddingVertical: 15, alignItems: 'center', marginTop: 16,
    shadowColor: '#FF2D6F', shadowOpacity: 0.5, shadowRadius: 24,
    shadowOffset: {width: 0, height: 0},
  },
  fightBtnTxt: {fontFamily: PIXEL, fontSize: 14, color: '#000', letterSpacing: 1},

  switchRow: {alignItems: 'center', marginTop: 14},
  switchTxt: {fontSize: 13, fontFamily: 'Oswald-SemiBold', color: 'rgba(255,255,255,0.67)'},
});
