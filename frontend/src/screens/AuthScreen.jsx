import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
  Animated, Easing,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function CornerBrackets({color, size = 16, inset = -6}) {
  const corners = [
    {top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2},
    {top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2},
    {bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2},
    {bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2},
  ];
  return (
    <>
      {corners.map((c, i) => (
        <View key={i} style={[st.bracket, c, {width: size, height: size, borderColor: color}]} />
      ))}
    </>
  );
}

function FloatingOrbs() {
  const o1 = useRef(new Animated.Value(0)).current;
  const o2 = useRef(new Animated.Value(0)).current;
  const o3 = useRef(new Animated.Value(0)).current;
  const o4 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = (v, dur, delay) => Animated.loop(Animated.sequence([
      Animated.timing(v, {toValue: -20, duration: dur, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      Animated.timing(v, {toValue: 0,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
    ])).start();
    loop(o1, 3400, 0); loop(o2, 4200, 600); loop(o3, 2900, 1100); loop(o4, 3800, 300);
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{position:'absolute',width:320,height:320,borderRadius:160,backgroundColor:'rgba(170,0,255,0.15)',top:-120,left:-120,transform:[{translateY:o1}]}} />
      <Animated.View style={{position:'absolute',width:240,height:240,borderRadius:120,backgroundColor:'rgba(255,0,112,0.12)',top:80,right:-80,transform:[{translateY:o2}]}} />
      <Animated.View style={{position:'absolute',width:180,height:180,borderRadius:90,backgroundColor:'rgba(0,229,255,0.09)',bottom:180,left:-40,transform:[{translateY:o3}]}} />
      <Animated.View style={{position:'absolute',width:130,height:130,borderRadius:65,backgroundColor:'rgba(184,255,0,0.08)',bottom:60,right:10,transform:[{translateY:o4}]}} />
    </View>
  );
}

function BootScreen({onDone}) {
  const progress    = useRef(new Animated.Value(0)).current;
  const flash        = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = progress.addListener(({value}) => setPercent(Math.min(100, Math.round(value * 100))));
    Animated.timing(progress, {
      toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start(({finished}) => {
      if (finished) finish();
    });
    return () => progress.removeListener(id);
  }, []);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.sequence([
      Animated.timing(flash, {toValue: 1, duration: 70, useNativeDriver: true}),
      Animated.timing(flash, {toValue: 0, duration: 220, useNativeDriver: true}),
    ]).start(() => onDone());
  }

  return (
    <SafeAreaView style={st.bootSafe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <TouchableOpacity style={st.bootTouch} activeOpacity={1} onPress={finish}>
        <View style={st.bootCenter}>
          <Text style={st.bootEmblem}>SF</Text>
          <Text style={st.bootLabel}>LOADING ARENA{'…'}</Text>
          <View style={st.bootBarTrack}>
            <Animated.View
              style={[
                st.bootBarFill,
                {transform: [{scaleX: progress}]},
              ]}
            />
          </View>
          <Text style={st.bootPercent}>{percent}%</Text>
        </View>
        <Text style={st.bootSkip}>TAP TO SKIP</Text>
      </TouchableOpacity>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {backgroundColor: C.white, opacity: flash}]} />
    </SafeAreaView>
  );
}

export default function AuthScreen() {
  const {login, signup} = useAuth();
  const [booted, setBooted] = useState(false);

  // step: 'landing' | 'login' | 'signup'
  const [step, setStep]               = useState('landing');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [username, setUsername]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const checkTimer = useRef(null);
  const traceAnim = useRef(new Animated.Value(0)).current;

  function focusField(field) {
    setFocusedField(field);
    traceAnim.setValue(0);
    Animated.timing(traceAnim, {toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true}).start();
  }
  function blurField() {
    setFocusedField(null);
    Animated.timing(traceAnim, {toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: true}).start();
  }

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

  useEffect(() => () => { if (checkTimer.current) clearTimeout(checkTimer.current); }, []);

  // ── logo animations ──────────────────────────────────────────────
  const topSlide  = useRef(new Animated.Value(-30)).current;
  const topOp     = useRef(new Animated.Value(0)).current;
  const blobScale = useRef(new Animated.Value(0.85)).current;
  const drip1     = useRef(new Animated.Value(0)).current;
  const drip2     = useRef(new Animated.Value(0)).current;
  const drip3     = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOp    = useRef(new Animated.Value(0.4)).current;

  const formSlide = useRef(new Animated.Value(30)).current;
  const formOp    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!booted) return;
    Animated.parallel([
      Animated.spring(blobScale, {toValue: 1, tension: 70, friction: 7, useNativeDriver: true}),
      Animated.spring(topSlide,  {toValue: 0, tension: 55, friction: 9, useNativeDriver: true}),
      Animated.timing(topOp,    {toValue: 1, duration: 300, useNativeDriver: true}),
      Animated.spring(formSlide, {toValue: 0, delay: 180, tension: 60, friction: 8, useNativeDriver: true}),
      Animated.timing(formOp,   {toValue: 1, duration: 280, delay: 180, useNativeDriver: true}),
      Animated.timing(drip1,    {toValue: 1, duration: 400, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(drip2,    {toValue: 1, duration: 460, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
      Animated.timing(drip3,    {toValue: 1, duration: 380, delay: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true}),
    ]).start();
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(glowScale, {toValue: 1.09, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(glowOp,    {toValue: 0.15, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(glowScale, {toValue: 1,    duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(glowOp,    {toValue: 0.4,  duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    ]));
    glowLoop.start();
    return () => glowLoop.stop();
  }, [booted]);

  function enterStep(newStep) {
    Animated.sequence([
      Animated.timing(formOp, {toValue: 0, duration: 100, useNativeDriver: true}),
      Animated.timing(formOp, {toValue: 1, duration: 220, useNativeDriver: true}),
    ]).start();
    setStep(newStep);
    setFocusedField(null);
  }

  const btnScale = useRef(new Animated.Value(1)).current;
  function btnIn()  { Animated.spring(btnScale, {toValue: 0.96, tension: 300, friction: 10, useNativeDriver: true}).start(); }
  function btnOut() { Animated.spring(btnScale, {toValue: 1,    tension: 300, friction: 10, useNativeDriver: true}).start(); }

  async function submitLogin() {
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

  async function submitSignup() {
    if (!username)  { Alert.alert('Required', 'Pick a fighter name'); return; }
    if (!email)     { Alert.alert('Required', 'Enter your email'); return; }
    if (!password)  { Alert.alert('Required', 'Choose a password'); return; }
    if (usernameStatus === 'taken')    { Alert.alert('Username Taken', 'That fighter name is already taken.'); return; }
    if (usernameStatus === 'checking') { Alert.alert('Hold on', 'Still checking username availability...'); return; }
    setLoading(true);
    try {
      await signup(email, password, username);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('Try logging in')) {
        Alert.alert(
          'Email Already Registered',
          'That email already has an account. Switch to login?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Log In', onPress: () => { enterStep('login'); }},
          ]
        );
      } else {
        Alert.alert('Signup Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  const dripTY = (a, dist) => a.interpolate({inputRange: [0, 1], outputRange: [0, dist]});

  const Logo = () => (
    <Animated.View style={[st.top, {opacity: topOp, transform: [{translateY: topSlide}]}]}>
      <Animated.View style={[st.blobWrap, {transform: [{scale: blobScale}]}]}>
        <CornerBrackets color={C.cyan} />
        <Animated.View style={[st.drip, st.drip1, {transform: [{translateY: dripTY(drip1, 22)}]}]} />
        <Animated.View style={[st.drip, st.drip2, {transform: [{translateY: dripTY(drip2, 28)}]}]} />
        <Animated.View style={[st.drip, st.drip3, {transform: [{translateY: dripTY(drip3, 20)}]}]} />
        <Text style={st.logoLine}>STREAK</Text>
        <Text style={[st.logoLine, st.logoLineTwo]}>FIGHT</Text>
      </Animated.View>
      <Text style={st.tagline}>your group knows when you skip.</Text>
    </Animated.View>
  );

  const traceColor = (field) => {
    if (field === 'username') {
      if (usernameStatus === 'available') return C.lime;
      if (usernameStatus === 'taken') return C.red;
    }
    return C.cyan;
  };

  const Field = ({label, hint, value, onChangeText, placeholder, secure, keyboard, statusNode, field}) => (
    <View style={{marginBottom: 18}}>
      <View style={st.fieldLabelRow}>
        <Text style={[st.fieldLabel, focusedField === field && st.fieldLabelFocused]}>{label}::</Text>
        {statusNode}
      </View>
      {hint ? <Text style={st.fieldHint}>&gt; {hint}</Text> : null}
      <View style={{position: 'relative'}}>
        <TextInput
          style={[
            st.input,
            focusedField === field && st.inputFocused,
            field === 'username' && usernameStatus === 'available' && st.inputAvailable,
            field === 'username' && usernameStatus === 'taken'     && st.inputTaken,
          ]}
          placeholder={placeholder}
          placeholderTextColor={C.white40}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!!secure}
          keyboardType={keyboard || 'default'}
          autoCapitalize={keyboard === 'email-address' || field === 'username' ? 'none' : 'sentences'}
          autoCorrect={false}
          onFocus={() => focusField(field)}
          onBlur={blurField}
        />
        {focusedField === field && (
          <Animated.View
            pointerEvents="none"
            style={[
              st.traceBar,
              {backgroundColor: traceColor(field), transform: [{scaleX: traceAnim}]},
            ]}
          />
        )}
      </View>
    </View>
  );

  const SubmitBtn = ({text, onPress}) => (
    <View style={st.btnContainer}>
      <Animated.View style={[st.btnGlow, {opacity: glowOp, transform: [{scale: glowScale}]}]} />
      <Animated.View style={{transform: [{scale: btnScale}]}}>
        <TouchableOpacity
          style={st.btn} onPress={onPress}
          onPressIn={btnIn} onPressOut={btnOut}
          disabled={loading} activeOpacity={1}>
          {loading
            ? <ActivityIndicator color={C.bgDeep} />
            : <Text style={st.btnText}>{text}</Text>}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const BackBtn = ({to}) => (
    <TouchableOpacity onPress={() => enterStep(to)} style={{marginBottom: 20}}>
      <Text style={st.backBtn}>← Back</Text>
    </TouchableOpacity>
  );

  if (!booted) {
    return <BootScreen onDone={() => setBooted(true)} />;
  }

  return (
    <SafeAreaView style={st.safe}>
      <FloatingOrbs />
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={st.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Logo />

          <Animated.View style={{opacity: formOp, transform: [{translateY: formSlide}]}}>

            {/* ── LANDING ── */}
            {step === 'landing' && (
              <View style={st.landingWrap}>
                <SubmitBtn text="Create Account →" onPress={() => enterStep('signup')} />
                <TouchableOpacity style={st.loginLink} onPress={() => enterStep('login')}>
                  <Text style={st.loginLinkText}>Already fighting? <Text style={{color: C.pink, fontWeight: '900'}}>Log In</Text></Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── LOGIN ── */}
            {step === 'login' && (
              <View>
                <BackBtn to="landing" />
                <Text style={st.stepTitle}>Welcome back.</Text>
                <Field field="email"    label="EMAIL"    placeholder="you@example.com" value={email}    onChangeText={setEmail}    keyboard="email-address" />
                <Field field="password" label="PASSWORD" placeholder="••••••••"        value={password} onChangeText={setPassword}  secure />
                <SubmitBtn text="Log In →" onPress={submitLogin} />
                <TouchableOpacity style={st.switchWrap} onPress={() => enterStep('signup')}>
                  <Text style={st.switchText}>New here? <Text style={{color: C.pink}}>Create account</Text></Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── SIGNUP ── */}
            {step === 'signup' && (
              <View>
                <BackBtn to="landing" />
                <Text style={st.stepTitle}>Join the fight.</Text>

                <Field
                  field="username" label="FIGHTER NAME"
                  hint="your unique display name in battles"
                  placeholder="ENTER_CALLSIGN_"
                  value={username}
                  onChangeText={(val) => { setUsername(val); checkUsername(val); }}
                  statusNode={
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      {usernameStatus === 'checking'  && <ActivityIndicator size="small" color={C.white40} style={{marginLeft: 8}} />}
                      {usernameStatus === 'available' && <Text style={st.usernameAvailable}> ✓ available</Text>}
                      {usernameStatus === 'taken'     && <Text style={st.usernameTaken}> ✗ taken</Text>}
                    </View>
                  }
                />

                <Field field="email"    label="EMAIL"    placeholder="you@example.com" value={email}    onChangeText={setEmail}    keyboard="email-address" />
                <Field field="password" label="PASSWORD" placeholder="min 8 characters" value={password} onChangeText={setPassword}  secure />

                <SubmitBtn text="Join the Fight →" onPress={submitSignup} />
                <TouchableOpacity style={st.switchWrap} onPress={() => enterStep('login')}>
                  <Text style={st.switchText}>Already in? <Text style={{color: C.pink}}>Log in</Text></Text>
                </TouchableOpacity>
              </View>
            )}

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  bootSafe: {flex: 1, backgroundColor: C.bgDeep},
  bootTouch: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  bootCenter: {alignItems: 'center', width: '70%'},
  bootEmblem: {
    fontSize: 40, fontWeight: '900', color: C.pink, letterSpacing: 4,
    textShadowColor: C.purple, textShadowRadius: 18, textShadowOffset: {width: 0, height: 0},
    marginBottom: 18,
  },
  bootLabel: {
    fontSize: 13, fontWeight: '700', color: C.cyan, letterSpacing: 3,
    fontFamily: MONO, marginBottom: 22,
  },
  bootBarTrack: {
    width: '100%', height: 6, borderRadius: 3,
    backgroundColor: C.white08, borderWidth: 1, borderColor: C.white15,
    overflow: 'hidden',
  },
  bootBarFill: {
    width: '100%', height: '100%', borderRadius: 3,
    backgroundColor: C.lime, transform: [{scaleX: 0}],
    shadowColor: C.lime, shadowOpacity: 0.8, shadowRadius: 10,
  },
  bootPercent: {
    fontSize: 12, fontFamily: MONO, color: C.white40, letterSpacing: 2, marginTop: 10,
  },
  bootSkip: {
    position: 'absolute', bottom: 40, fontSize: 11, fontFamily: MONO,
    color: C.white40, letterSpacing: 2,
  },

  safe:   {flex: 1, backgroundColor: C.bg},
  scroll: {flexGrow: 1, paddingHorizontal: 26, paddingBottom: 48},

  top: {paddingTop: 52, marginBottom: 40},
  blobWrap: {
    backgroundColor: C.bgDeep, borderRadius: 24,
    paddingHorizontal: 30, paddingVertical: 20,
    marginBottom: 30, alignSelf: 'flex-start',
    borderWidth: 2, borderColor: 'rgba(255,0,112,0.6)',
    shadowColor: C.pink, shadowOpacity: 0.65, shadowRadius: 38,
    shadowOffset: {width: 0, height: 0}, elevation: 24,
    position: 'relative',
  },
  bracket: {position: 'absolute'},
  traceBar: {
    position: 'absolute', bottom: -1, left: 0, right: 0,
    height: 2, borderRadius: 1,
  },
  logoLine: {
    fontSize: 50, fontWeight: '900', color: C.yellow,
    letterSpacing: 7,
    textShadowColor: C.orange, textShadowRadius: 12,
    textShadowOffset: {width: 0, height: 0}, lineHeight: 56,
  },
  logoLineTwo: {
    color: C.pink,
    textShadowColor: C.purple, textShadowRadius: 16,
    textShadowOffset: {width: 0, height: 0},
  },
  drip:  {position: 'absolute', bottom: -8, width: 12, height: 20, borderRadius: 7, backgroundColor: C.pink},
  drip1: {left: '18%'}, drip2: {left: '44%'}, drip3: {left: '70%'},
  tagline: {fontSize: 14, color: C.white40, fontWeight: '600', letterSpacing: 0.6},

  landingWrap: {gap: 0},
  loginLink:   {marginTop: 20, alignItems: 'center'},
  loginLinkText: {fontSize: 15, color: C.white70, fontWeight: '600'},

  stepTitle: {
    fontSize: 26, fontWeight: '900', color: C.yellow,
    marginBottom: 28, letterSpacing: 0.5,
    textShadowColor: C.pink, textShadowRadius: 10,
    textShadowOffset: {width: 0, height: 0},
  },
  backBtn: {fontSize: 14, color: C.white40, fontWeight: '700', marginBottom: 4},

  fieldLabelRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  fieldLabel:    {fontSize: 11, fontWeight: '700', color: C.white40, letterSpacing: 2, fontFamily: MONO},
  fieldLabelFocused: {color: C.pink},
  fieldHint:     {fontSize: 12, color: C.white40, marginBottom: 6, marginTop: -4, fontFamily: MONO},
  usernameAvailable: {fontSize: 11, fontWeight: '800', color: C.lime, fontFamily: MONO},
  usernameTaken:     {fontSize: 11, fontWeight: '800', color: C.red, fontFamily: MONO},

  input: {
    backgroundColor: C.white08, borderWidth: 1.5, borderColor: C.white15,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 15, color: C.white,
  },
  inputFocused: {
    borderColor: C.pink, backgroundColor: 'rgba(255,0,112,0.09)',
    shadowColor: C.pink, shadowOpacity: 0.4, shadowRadius: 14,
    shadowOffset: {width: 0, height: 0}, elevation: 6,
  },
  inputAvailable: {borderColor: C.lime, backgroundColor: 'rgba(184,255,0,0.07)'},
  inputTaken:     {borderColor: C.red,  backgroundColor: 'rgba(255,59,59,0.07)'},

  btnContainer: {position: 'relative', marginTop: 8},
  btnGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18, backgroundColor: C.pink,
  },
  btn: {
    backgroundColor: C.pink, borderRadius: 18,
    paddingVertical: 19, alignItems: 'center',
    shadowColor: C.pink, shadowOpacity: 0.65,
    shadowRadius: 24, shadowOffset: {width: 0, height: 6}, elevation: 14,
  },
  btnText: {color: C.white, fontWeight: '900', fontSize: 17, letterSpacing: 2},

  switchWrap: {marginTop: 22, alignItems: 'center'},
  switchText: {color: C.white40, fontSize: 14, fontWeight: '600'},
});
