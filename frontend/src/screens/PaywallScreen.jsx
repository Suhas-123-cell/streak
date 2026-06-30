import React, {useState, useRef, useEffect} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, StatusBar, Alert, Animated, ActivityIndicator,
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import {useAuth} from '../context/AuthContext';
import {endpoints} from '../constants/api';
import {C} from '../constants/theme';
import {ArcadeBackdrop, ArcadeTopBar, HardCard} from '../components/ArcadeUI';

const PLANS = {
  pro_monthly: {label: 'MONTHLY', price: '₹649/mo'},
  pro_yearly:  {label: 'YEARLY',  price: '₹4,999/yr', saveBadge: 'SAVE 37%'},
};

const FEATURES = [
  {free: 'Up to 20 battles',         pro: 'Unlimited battles'},
  {free: '1 freeze token / 7 days',  pro: 'Unlimited freeze tokens'},
  {free: 'Photo + voice proof',      pro: 'Video proof (15-sec)'},
  {free: 'Standard rank badges',     pro: 'Animated rank card ♛'},
  {free: '—',                        pro: 'Priority AI verification'},
];

function FeatureRow({free, pro, index}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: 80 + index * 70, tension: 60, friction: 8, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[
      styles.featureRow,
      {opacity: anim, transform: [{translateX: anim.interpolate({inputRange: [0, 1], outputRange: [-16, 0]})}]},
    ]}>
      <View style={styles.featureCell}><Text style={styles.freeText}>{free}</Text></View>
      <View style={styles.featureCell}><Text style={styles.proText}>{pro}</Text></View>
    </Animated.View>
  );
}

export default function PaywallScreen({navigation}) {
  const {token, user} = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState('pro_monthly');
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, {toValue: 1, tension: 50, friction: 8, useNativeDriver: true}).start();
  }, []);

  async function purchase() {
    setLoading(true);
    try {
      const orderRes = await fetch(endpoints.subscriptionOrder, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({plan}),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.detail || 'Could not create order');
      }
      const order = await orderRes.json();

      const data = await RazorpayCheckout.open({
        description: plan === 'pro_monthly' ? 'StreakFight Pro Monthly' : 'StreakFight Pro Yearly',
        currency: order.currency,
        key: order.key_id,
        amount: String(order.amount),
        name: 'StreakFight',
        order_id: order.order_id,
        prefill: {email: user?.email || '', name: user?.username || ''},
        theme: {color: C.yellow},
      });

      const verifyRes = await fetch(endpoints.subscriptionVerify, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({...data, plan}),
      });
      if (!verifyRes.ok) throw new Error('Payment verification failed — contact support');

      Alert.alert('You are Pro!', 'Unlimited battles and AI check-ins are now unlocked.', [
        {text: "Let's fight!", onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      if (e?.code !== 'PAYMENT_CANCELLED') {
        Alert.alert('Purchase failed', e.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  const selectedPlan = PLANS[plan];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDeep} />
      <ArcadeBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <ArcadeTopBar center="PRO UPGRADE" right="CPU" />

        <Animated.View style={[styles.hero, {
          opacity: headerAnim,
          transform: [{scale: headerAnim.interpolate({inputRange: [0, 1], outputRange: [0.9, 1]})}],
        }]}>
          <Text style={styles.crown}>♛</Text>
          <Text style={styles.heroTitle}>GO PRO</Text>
          <Text style={styles.heroSub}>Unlimited battles · AI verification</Text>
        </Animated.View>

        <View style={styles.planToggle}>
          {Object.entries(PLANS).map(([key, p]) => (
            <TouchableOpacity
              key={key}
              style={[styles.planBtn, plan === key && styles.planBtnActive]}
              onPress={() => setPlan(key)}
              activeOpacity={0.8}>
              <Text style={[styles.planLabel, plan === key && styles.planLabelActive]}>{p.label}</Text>
              <Text style={[styles.planPrice, plan === key && styles.planPriceActive]}>{p.price}</Text>
              {p.saveBadge ? <Text style={styles.saveBadge}>{p.saveBadge}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>

        <HardCard borderColor={C.purple} shadowColor="rgba(170,0,255,0.3)" style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadCell, {color: C.white70}]}>FREE</Text>
            <Text style={[styles.tableHeadCell, {color: C.yellow}]}>PRO ♛</Text>
          </View>
          {FEATURES.map((f, i) => <FeatureRow key={i} {...f} index={i} />)}
        </HardCard>

        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
          onPress={purchase}
          disabled={loading}
          activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color="#05030a" />
            : <Text style={styles.ctaText}>UPGRADE NOW ▶</Text>}
        </TouchableOpacity>

        <Text style={styles.fine}>
          {selectedPlan.price} · Cancel anytime{'\n'}
          Secure payment via Razorpay
        </Text>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: C.bg},
  content: {paddingBottom: 40},

  hero: {alignItems: 'center', paddingVertical: 24},
  crown: {fontSize: 40, marginBottom: 8},
  heroTitle: {
    fontFamily: 'PressStart2P-Regular', fontSize: 22, color: C.yellow, letterSpacing: 3, lineHeight: 34,
    textShadowColor: C.pink, textShadowOffset: {width: 3, height: 3}, textShadowRadius: 0,
  },
  heroSub: {fontFamily: 'Oswald-SemiBold', fontSize: 14, color: C.white70, marginTop: 10},

  planToggle: {flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 20},
  planBtn: {flex: 1, borderWidth: 2, borderColor: C.white15, padding: 16, alignItems: 'center'},
  planBtnActive: {borderColor: C.yellow, backgroundColor: 'rgba(255,212,0,0.08)'},
  planLabel: {fontFamily: 'PressStart2P-Regular', fontSize: 8, color: C.white70, lineHeight: 14},
  planLabelActive: {color: C.yellow},
  planPrice: {fontFamily: 'Oswald-Bold', fontSize: 20, color: C.white70, marginTop: 6},
  planPriceActive: {color: '#fff'},
  saveBadge: {
    fontFamily: 'PressStart2P-Regular', fontSize: 7, color: '#9BE80C',
    backgroundColor: 'rgba(155,232,12,0.12)', paddingHorizontal: 6, paddingVertical: 3, marginTop: 4,
  },

  table: {marginHorizontal: 20, marginBottom: 24},
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.white15,
  },
  tableHeadCell: {flex: 1, fontFamily: 'PressStart2P-Regular', fontSize: 8, letterSpacing: 1, lineHeight: 14},
  featureRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  featureCell: {flex: 1},
  freeText: {fontFamily: 'Oswald-SemiBold', fontSize: 13, color: C.white70},
  proText: {fontFamily: 'Oswald-Bold', fontSize: 13, color: '#fff'},

  ctaBtn: {
    marginHorizontal: 20, backgroundColor: C.yellow, borderWidth: 3, borderColor: '#fff',
    paddingVertical: 18, alignItems: 'center',
    shadowColor: C.purple, shadowOpacity: 0.9, shadowRadius: 0, shadowOffset: {width: 5, height: 5},
  },
  ctaBtnDisabled: {opacity: 0.6},
  ctaText: {color: '#05030a', fontFamily: 'PressStart2P-Regular', fontSize: 11, letterSpacing: 1, lineHeight: 18},

  fine: {textAlign: 'center', fontSize: 12, color: C.white70, lineHeight: 18, marginTop: 14, paddingHorizontal: 32},

  skipBtn: {alignItems: 'center', marginTop: 16, padding: 12},
  skipText: {fontFamily: 'Oswald-SemiBold', fontSize: 14, color: 'rgba(255,255,255,0.35)'},
});
