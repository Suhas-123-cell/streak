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

// Fighter color palette for character selection
const COLORS = [
  {key: 'pink',   hex: C.pink},
  {key: 'cyan',   hex: C.cyan},
  {key: 'yellow', hex: C.yellow},
  {key: 'lime',   hex: C.lime},
  {key: 'purple', hex: C.purple},
];

const RANK_STRIP = ['ROOKIE', 'FIGHTER', 'CHAMP', 'MASTER'];
const RANK_ICONS = ['★', '★', '◆', '♛'];

// Hard offset pixel-art drop-shadow card — cross-platform, no blur
function HardCard({color, shadowColor, style, children}) {
  return (
    <View style={{paddingRight: 6, paddingBottom: 6}}>
      <View>
        <View style={{
          position: 'absolute', top: 6, left: 0, right: 0, bottom: 0,
          backgroundColor: shadowColor || 'rgba(255,45,111,0.35)',
        }} />
        <View style={[{
          backgroundColor: '#160f1e',
          borderWidth: 2, borderColor: color || C.pink,
        }, style]}>
          {children}
        </View>
      </View>
    </View>
  );
}

// Simulated perspective floor using stacked horizontal lines (no CSS transforms)
function StageFloor() {
  const LINE_Y = [0, 7, 16, 28, 43, 62, 86, 115];
  return (
    <View style={st.stageWrap} pointerEvents="none">
      <View style={st.horizonLine} />
      {LINE_Y.map((top, i) => (
        <View key={i} style={[st.floorLine, {top, opacity: 0.28 + i * 0.07}]} />
      ))}
    </View>
  );
}

// Repeating blink for INSERT COIN
function BlinkText({text, style}) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, {toValue: 0, duration: 480, useNativeDriver: true}),
        Animated.timing(blink, {toValue: 1, duration: 480, useNativeDriver: true}),
      ])
    ).start();
  }, []);
  return <Animated.Text style={[style, {opacity: blink}]}>{text}</Animated.Text>;
}

// Lightweight CRT scan-line overlay (plain Views, no SVG)
function ScanOverlay() {
  const rows = Array.from({length: 40});
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {rows.map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', top: i * 16, left: 0, right: 0,
            height: 2, backgroundColor: 'rgba(0,0,0,0.18)',
          }}
        />
      ))}
    </View>
  );
}

// Diamond medal rank path shown on landing screen
function RankStrip() {
  return (
    <View style={st.rankPanel}>
      <Text style={st.rankHdr}>RANK ▶ PATH TO GRANDMASTER</Text>
      <View style={st.ranksRow}>
        <View style={st.rankConnector} />
        {RANK_STRIP.map((name, i) => (
          <View key={name} style={st.rankSlot}>
            <View style={[st.rankMedal, i === 0 && st.rankActive]}>
              <Text style={[
                st.rankIcon,
                i === 0 ? {color: C.yellow} : {color: 'rgba(255,255,255,0.3)'},
              ]}>
                {RANK_ICONS[i]}
              </Text>
            </View>
            <Text style={[
              st.rankLabel,
              i === 0 ? {color: C.yellow} : {color: 'rgba(255,255,255,0.4)'},
            ]}>
              {name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── BOOT SCREEN ──────────────────────────────────────────────────────
function BootScreen({onDone}) {
  const startScale = useRef(new Animated.Value(1)).current;
  const startGlow  = useRef(new Animated.Value(0.4)).current;
  const flash      = useRef(new Animated.Value(0)).current;
  const doneRef    = useRef(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(startGlow, {toValue: 0.9, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(startGlow, {toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ])
    ).start();
  }, []);

  function pressStart() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.spring(startScale, {toValue: 0.92, tension: 400, friction: 5, useNativeDriver: true}).start(() => {
      Animated.sequence([
        Animated.timing(flash, {toValue: 1, duration: 60, useNativeDriver: true}),
        Animated.timing(flash, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]).start(() => onDone());
    });
  }

  return (
    <SafeAreaView style={st.bootSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ScanOverlay />
      <StageFloor />

      <View style={st.topBar}>
        <Text style={st.topBarTxt}>1P</Text>
        <Text style={st.topBarTxt}>CREDIT 99</Text>
        <Text style={st.topBarTxt}>CPU</Text>
      </View>

      <View style={st.bootMid}>
        {/* Chromatic offset logo — ghost cyan/pink layers + white on top */}
        <View style={st.logoWrap}>
          <Text style={st.logoLine1}>STREAK</Text>
          <View style={{alignSelf: 'center', height: 44}}>
            <Text style={[st.logoLine2, {position: 'absolute', color: C.cyan, left: -4, top: 0}]}>FIGHT</Text>
            <Text style={[st.logoLine2, {position: 'absolute', color: C.pink, left: 4, top: 0}]}>FIGHT</Text>
            <Text style={st.logoLine2}>FIGHT</Text>
          </View>
          <Text style={st.roundLabel}>▶ ROUND 1 ◀</Text>
        </View>
      </View>

      <View style={st.bootBottom}>
        <BlinkText text="INSERT COIN" style={st.insertCoin} />
        <Animated.View style={{transform: [{scale: startScale}]}}>
          <TouchableOpacity style={st.startBtnWrap} onPress={pressStart} activeOpacity={1}>
            <View style={st.startBtnShadow} />
            <Animated.View style={[st.startBtn, {opacity: startGlow.interpolate({
              inputRange: [0.4, 0.9], outputRange: [0.85, 1],
            })}]}>
              <Text style={st.startBtnTxt}>PRESS START</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* CRT white-flash on transition out */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {backgroundColor: C.white, opacity: flash}]}
      />
    </SafeAreaView>
  );
}

// ── SELECT YOUR FIGHTER (LANDING) ────────────────────────────────────
function SelectFighter({onNew, onContinue}) {
  const slideIn = useRef(new Animated.Value(30)).current;
  const op      = useRef(new Animated.Value(0)).current;
  const [countDisplay, setCountDisplay] = useState(9);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, {toValue: 0, tension: 60, friction: 9, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 280, useNativeDriver: true}),
    ]).start();

    // Countdown loop displayed on CONTINUE card
    let n = 9;
    const id = setInterval(() => {
      n = n > 1 ? n - 1 : 9;
      setCountDisplay(n);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={{flex: 1, opacity: op, transform: [{translateY: slideIn}]}}>
      <View style={st.topBar}>
        <Text style={st.topBarTxt}>1P</Text>
        <Text style={st.topBarTxt}>HI-SCORE 24</Text>
      </View>

      <View style={st.screenPad}>
        <Text style={st.scrTitle}>SELECT YOUR{'\n'}FIGHTER</Text>
        <Text style={st.scrSub}>Your squad sees every skip.</Text>

        <View style={st.onlineBadge}>
          <View style={st.onlineDot} />
          <Text style={st.onlineTxt}>Squad online</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={onNew}>
          <HardCard color={C.pink} shadowColor="rgba(255,45,111,0.35)">
            <View style={st.cardInner}>
              <Text style={[st.cardKey, {color: C.pink}]}>NEW CHALLENGER</Text>
              <Text style={st.cardDesc}>Create a fighter & enter the arena</Text>
              <Text style={[st.cardArrow, {color: C.pink}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={onContinue} style={{marginTop: 4}}>
          <HardCard color={C.cyan} shadowColor="rgba(25,224,255,0.28)">
            <View style={st.cardInner}>
              <Text style={[st.cardKey, {color: C.cyan}]}>CONTINUE?</Text>
              <Text style={st.cardDesc}>Resume your streak</Text>
              <Text style={[st.cardCount, {color: C.yellow}]}>{countDisplay}</Text>
              <Text style={[st.cardArrow, {color: C.cyan}]}>▶</Text>
            </View>
          </HardCard>
        </TouchableOpacity>
      </View>

      <RankStrip />
    </Animated.View>
  );
}

// ── CREATE FIGHTER (SIGNUP) ──────────────────────────────────────────
function CreateFighter({onBack, signup}) {
  const slideIn    = useRef(new Animated.Value(40)).current;
  const op         = useRef(new Animated.Value(0)).current;
  const checkTimer = useRef(null);

  const [fighterName,    setFighterName]    = useState('');
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [fighterColor,   setFighterColor]   = useState('pink');
  const [loading,        setLoading]        = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, {toValue: 0, tension: 65, friction: 9, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, []);

  const checkUsername = useCallback((val) => {
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (!val || val.length < 2) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(endpoints.checkUsername(val));
        const json = await res.json();
        setUsernameStatus(json.available ? 'available' : 'taken');
      } catch { setUsernameStatus(null); }
    }, 500);
  }, []);

  async function submit() {
    if (!fighterName) { Alert.alert('Required', 'Pick your fighter name'); return; }
    if (usernameStatus === 'taken')    { Alert.alert('Name Taken', 'That fighter name is already taken.'); return; }
    if (usernameStatus === 'checking') { Alert.alert('Hold on', 'Still checking name availability...'); return; }
    if (!email)    { Alert.alert('Required', 'Enter your email'); return; }
    if (!password) { Alert.alert('Required', 'Choose a password'); return; }
    setLoading(true);
    try {
      await signup(email, password, fighterName, fighterColor);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('Try logging in')) {
        Alert.alert('Email Already Registered', 'That email already has an account. Switch to login?', [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Log In', onPress: onBack},
        ]);
      } else {
        Alert.alert('Signup Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const emblemColor = COLORS.find(c => c.key === fighterColor)?.hex || C.pink;
  const initial = fighterName ? fighterName[0].toUpperCase() : '?';

  return (
    <Animated.View style={{flex: 1, opacity: op, transform: [{translateY: slideIn}]}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={st.topBar}>
            <TouchableOpacity onPress={onBack}>
              <Text style={st.topBarTxt}>◀ BACK</Text>
            </TouchableOpacity>
            <Text style={st.topBarTxt}>NEW FIGHTER</Text>
          </View>

          <View style={st.vsRow}>
            <Text style={[st.vsPlayer, {color: C.cyan}]}>YOU</Text>
            <Text style={st.vsBig}>VS</Text>
            <Text style={[st.vsPlayer, {color: C.pink}]}>SKIP</Text>
          </View>

          {/* Single fighter dossier card: emblem + swatches + ACCOUNT section + CTA */}
          <HardCard color={C.pink} shadowColor="rgba(255,45,111,0.30)">
            <View style={st.dossierPad}>
              <View style={st.idRow}>
                <View style={[st.emblem, {borderColor: emblemColor}]}>
                  <Text style={[st.emblemTxt, {color: emblemColor}]}>{initial}</Text>
                </View>
                <View style={{flex: 1, minWidth: 0}}>
                  <TextInput
                    style={[
                      st.nameInput,
                      usernameStatus === 'available' && {borderBottomColor: C.lime},
                      usernameStatus === 'taken'     && {borderBottomColor: C.red},
                    ]}
                    placeholder="FIGHTER NAME"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={fighterName}
                    onChangeText={(val) => { setFighterName(val); checkUsername(val); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                  {usernameStatus === 'checking'  && <ActivityIndicator size="small" color={C.white40} style={{marginTop: 4}} />}
                  {usernameStatus === 'available' && <Text style={[st.availTxt, {color: C.lime}]}>✓ AVAILABLE</Text>}
                  {usernameStatus === 'taken'     && <Text style={[st.availTxt, {color: C.red}]}>✗ TAKEN</Text>}
                  <View style={st.swatches}>
                    {COLORS.map(c => (
                      <TouchableOpacity
                        key={c.key}
                        activeOpacity={0.7}
                        onPress={() => setFighterColor(c.key)}
                        style={[
                          st.swatch,
                          {backgroundColor: c.hex},
                          fighterColor === c.key && st.swatchActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={st.dossDivider}>
                <View style={st.dossDivLine} />
                <Text style={st.dossDivTxt}>ACCOUNT</Text>
                <View style={st.dossDivLine} />
              </View>

              <TextInput
                style={st.credInput}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[st.credInput, {marginBottom: 0}]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[st.fightBtn, loading && {opacity: 0.6}]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={C.bgDeep} />
                  : <Text style={st.fightBtnTxt}>FIGHT! ▶</Text>}
              </TouchableOpacity>
            </View>
          </HardCard>

          <TouchableOpacity onPress={onBack} style={{alignItems: 'center', marginTop: 16}}>
            <Text style={st.switchTxt}>
              Already fighting?{' '}
              <Text style={{color: C.cyan, fontWeight: '700'}}>CONTINUE</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ── CONTINUE (LOGIN) ────────────────────────────────────────────────
function ContinueFighter({onBack, login}) {
  const slideIn = useRef(new Animated.Value(40)).current;
  const op      = useRef(new Animated.Value(0)).current;
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, {toValue: 0, tension: 65, friction: 9, useNativeDriver: true}),
      Animated.timing(op, {toValue: 1, duration: 260, useNativeDriver: true}),
    ]).start();
  }, []);

  async function submit() {
    if (!email || !password) { Alert.alert('Required', 'Enter your email and password'); return; }
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Animated.View style={{flex: 1, opacity: op, transform: [{translateY: slideIn}]}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={[st.screenPad, {paddingBottom: 60}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={st.topBar}>
            <TouchableOpacity onPress={onBack}>
              <Text style={st.topBarTxt}>◀ BACK</Text>
            </TouchableOpacity>
            <Text style={st.topBarTxt}>CONTINUE?</Text>
          </View>

          <Text style={st.scrTitle}>WELCOME{'\n'}BACK.</Text>
          <Text style={st.scrSub}>Your streak is waiting.</Text>

          <HardCard color={C.cyan} shadowColor="rgba(25,224,255,0.28)" style={{marginTop: 8}}>
            <View style={st.dossierPad}>
              <TextInput
                style={[st.credInput, {borderColor: 'rgba(25,224,255,0.4)'}]}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[st.credInput, {marginBottom: 0, borderColor: 'rgba(25,224,255,0.4)'}]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[st.fightBtn, {backgroundColor: C.cyan, shadowColor: C.cyan}, loading && {opacity: 0.6}]}
                onPress={submit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={C.bgDeep} />
                  : <Text style={st.fightBtnTxt}>LOG IN ▶</Text>}
              </TouchableOpacity>
            </View>
          </HardCard>

          <TouchableOpacity onPress={onBack} style={{alignItems: 'center', marginTop: 16}}>
            <Text style={st.switchTxt}>
              New here?{' '}
              <Text style={{color: C.pink, fontWeight: '700'}}>NEW CHALLENGER</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ── ROOT AUTH SCREEN ─────────────────────────────────────────────────
export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [phase, setPhase] = useState('boot'); // 'boot' | 'landing' | 'signup' | 'login'

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />

      {phase === 'boot' && (
        <BootScreen onDone={() => setPhase('landing')} />
      )}
      {phase === 'landing' && (
        <SelectFighter
          onNew={() => setPhase('signup')}
          onContinue={() => setPhase('login')}
        />
      )}
      {phase === 'signup' && (
        <CreateFighter
          onBack={() => setPhase('landing')}
          signup={signup}
        />
      )}
      {phase === 'login' && (
        <ContinueFighter
          onBack={() => setPhase('landing')}
          login={login}
        />
      )}
    </SafeAreaView>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bgDeep},

  // Stage floor
  stageWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
    overflow: 'hidden',
  },
  horizonLine: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: C.cyan,
    shadowColor: C.cyan, shadowOpacity: 0.9, shadowRadius: 18,
    shadowOffset: {width: 0, height: 0}, elevation: 4,
  },
  floorLine: {
    position: 'absolute', left: 0, right: 0, height: 1.5,
    backgroundColor: C.cyan,
  },

  // Boot screen
  bootSafe: {flex: 1, backgroundColor: C.bgDeep},
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },
  topBarTxt: {fontFamily: PIXEL, fontSize: 8, color: C.cyan, letterSpacing: 1},
  bootMid: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60},
  logoWrap: {alignItems: 'center'},
  logoLine1: {
    fontFamily: PIXEL, fontSize: 34, color: C.yellow,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 0,
    textShadowOffset: {width: 4, height: 4}, marginBottom: 6,
  },
  logoLine2: {fontFamily: PIXEL, fontSize: 34, color: '#fff', marginBottom: 8},
  roundLabel: {fontFamily: PIXEL, fontSize: 9, color: C.cyan, letterSpacing: 2, marginTop: 8},
  bootBottom: {alignItems: 'center', paddingBottom: 170, gap: 14},
  insertCoin: {fontFamily: PIXEL, fontSize: 10, color: C.lime, letterSpacing: 1},
  startBtnWrap: {position: 'relative', paddingRight: 6, paddingBottom: 6},
  startBtnShadow: {
    position: 'absolute', top: 6, left: 0, right: 0, bottom: 0,
    backgroundColor: C.pink,
  },
  startBtn: {
    backgroundColor: C.yellow, borderWidth: 3, borderColor: '#fff',
    paddingHorizontal: 28, paddingVertical: 16,
  },
  startBtnTxt: {fontFamily: PIXEL, fontSize: 13, color: C.bgDeep, letterSpacing: 1},

  // Shared layout
  screenPad: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32},
  scrTitle: {
    fontFamily: PIXEL, fontSize: 15, color: '#fff', lineHeight: 26,
    textShadowColor: C.pink, textShadowRadius: 0,
    textShadowOffset: {width: 2, height: 2},
    marginTop: 16, marginBottom: 6,
  },
  scrSub: {
    fontSize: 14, fontWeight: '600',
    color: 'rgba(255,255,255,0.75)', marginBottom: 16, letterSpacing: 0.3,
  },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 18,
  },
  onlineDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.lime,
    shadowColor: C.lime, shadowOpacity: 0.9, shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  onlineTxt: {fontSize: 12, fontWeight: '700', color: '#fff'},

  // Selector cards
  cardInner: {padding: 16, paddingRight: 48},
  cardKey:   {fontFamily: PIXEL, fontSize: 11, marginBottom: 7},
  cardDesc:  {fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)'},
  cardArrow: {position: 'absolute', right: 14, top: 18, fontFamily: PIXEL, fontSize: 13},
  cardCount: {fontFamily: PIXEL, fontSize: 14, marginTop: 8, letterSpacing: 3},

  // Rank strip
  rankPanel: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#0e0916', padding: 16, margin: 16,
  },
  rankHdr: {
    fontFamily: PIXEL, fontSize: 7, color: 'rgba(255,255,255,0.65)',
    marginBottom: 16, letterSpacing: 1,
  },
  ranksRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', position: 'relative',
  },
  rankConnector: {
    position: 'absolute', left: '10%', right: '10%',
    top: 20, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', zIndex: 0,
  },
  rankSlot: {alignItems: 'center', width: 60, zIndex: 1},
  rankMedal: {
    width: 40, height: 40, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    transform: [{rotate: '45deg'}],
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bg, marginBottom: 8,
  },
  rankActive: {
    borderColor: C.yellow, backgroundColor: 'rgba(255,212,0,0.2)',
    width: 46, height: 46,
    shadowColor: C.yellow, shadowOpacity: 0.75, shadowRadius: 18,
    shadowOffset: {width: 0, height: 0}, elevation: 8,
  },
  rankIcon: {fontSize: 14, transform: [{rotate: '-45deg'}]},
  rankLabel: {fontFamily: PIXEL, fontSize: 6, letterSpacing: 0.5, textAlign: 'center'},

  // VS header on signup
  vsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 14, marginTop: 14, marginBottom: 18,
  },
  vsPlayer: {fontFamily: PIXEL, fontSize: 11},
  vsBig: {
    fontFamily: PIXEL, fontSize: 24, color: '#fff',
    textShadowColor: C.pink, textShadowRadius: 0,
    textShadowOffset: {width: 3, height: 3},
    transform: [{skewX: '-8deg'}],
  },

  // Dossier card internals
  dossierPad: {padding: 16},
  idRow: {flexDirection: 'row', gap: 14, alignItems: 'flex-start'},
  emblem: {
    width: 58, height: 58, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  emblemTxt: {fontFamily: PIXEL, fontSize: 24},
  nameInput: {
    fontFamily: PIXEL, fontSize: 11, color: '#fff',
    borderBottomWidth: 2, borderBottomColor: C.pink,
    paddingVertical: 4, paddingHorizontal: 2, marginBottom: 6,
  },
  availTxt: {fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6},
  swatches: {flexDirection: 'row', gap: 8, marginTop: 4},
  swatch: {width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'},
  swatchActive: {borderColor: '#fff'},

  dossDivider: {flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16},
  dossDivLine: {flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)'},
  dossDivTxt: {
    fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2, textTransform: 'uppercase',
  },

  credInput: {
    backgroundColor: '#0b0712',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 12,
    color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12,
  },

  fightBtn: {
    backgroundColor: C.pink, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 16, alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.55,
    shadowRadius: 22, shadowOffset: {width: 0, height: 4},
    elevation: 10, marginTop: 16,
  },
  fightBtnTxt: {fontFamily: PIXEL, fontSize: 14, color: C.bgDeep, letterSpacing: 1},

  switchTxt: {fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.65)'},
});
