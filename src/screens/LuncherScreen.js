import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocalStorage from '../storage/LocalStorage';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';

function LuncherScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const localStorage = useMemo(() => new LocalStorage(), []);
  const pulse = useRef(new Animated.Value(0.92)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const introAnimation = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.92,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    introAnimation.start();
    pulseAnimation.start();
    shimmerAnimation.start();

    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [fade, pulse, rise, shimmer]);

  const handleStart = async () => {
    if (isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      const user = await localStorage.getData('topLumUser');
      const nextRoute =
        user?.access_token && navigation?.getState?.()?.routeNames?.includes('Projects')
          ? 'Projects'
          : 'Login';

      const params = nextRoute === 'Projects' ? { user: user?.user } : undefined;

      navigation.reset({
        index: 0,
        routes: [{ name: nextRoute, params }],
      });
    } catch (error) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } finally {
      setIsStarting(false);
    }
  };

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-44, 44],
  });

  return (
    <View
      style={[
        styles.safeArea,
      ]}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.background}>
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />
        <View style={styles.gridLineOne} />
        <View style={styles.gridLineTwo} />
      </View>

      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fade,
              transform: [{ translateY: rise }],
            },
          ]}
        >
          <View style={styles.brandBlock}>
            <Animated.View
              style={[
                styles.logoShell,
                {
                  transform: [{ scale: pulse }],
                },
              ]}
            >
              <View style={styles.logoCore}>
                <Text style={styles.logoText}>A+</Text>
              </View>
              <Animated.View
                style={[
                  styles.logoShimmer,
                  {
                    transform: [{ translateX: shimmerTranslate }, { rotate: '18deg' }],
                  },
                ]}
              />
            </Animated.View>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>Alternatives plus</Text>
            </View>

            <Text style={styles.title}>Petite caisse, claire des le premier ecran</Text>
            <Text style={styles.subtitle}>
              Centralisez les depenses, suivez les entrees et retrouvez votre tableau de bord
              en un instant.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoEyebrow}>Demarrage securise</Text>
            <Text style={styles.infoTitle}>Preparation de votre espace mensuel</Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>Suivi</Text>
                <Text style={styles.metricLabel}>depenses et entrees</Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>Acces</Text>
                <Text style={styles.metricLabel}>equipe autorisee</Text>
              </View>
            </View>

            <View style={styles.loaderTrack}>
              <Animated.View
                style={[
                  styles.loaderGlow,
                  {
                    transform: [{
                      translateX: shimmer.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-120, 180],
                      }),
                    }],
                  },
                ]}
              />
            </View>

            <Text style={styles.loaderText}>Pret a ouvrir votre espace de caisse.</Text>

            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isStarting}
              onPress={handleStart}
              style={[styles.startButton, isStarting && styles.startButtonDisabled]}
            >
              <Text style={styles.startButtonText}>
                {isStarting ? 'Ouverture...' : 'Commencer'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#071D29',
  },
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#071D29',
  },
  glowPrimary: {
    position: 'absolute',
    top: -70,
    right: -30,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(26, 188, 156, 0.24)',
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 90,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(233, 196, 106, 0.14)',
  },
  gridLineOne: {
    position: 'absolute',
    top: '28%',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gridLineTwo: {
    position: 'absolute',
    bottom: '26%',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    flexGrow: 1,
    minHeight: '100%',
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'space-between',
  },
  brandBlock: {
    paddingTop: 28,
    alignItems: 'center',
  },
  logoShell: {
    width: 132,
    height: 132,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#021018',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  logoCore: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#F9FFFE',
    fontSize: 34,
    fontWeight: '900',
    fontFamily: FONT_DISPLAY,
  },
  logoShimmer: {
    position: 'absolute',
    width: 42,
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badge: {
    marginTop: 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#E1F2EF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  title: {
    marginTop: 22,
    color: '#F4FBFA',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: FONT_DISPLAY,
  },
  subtitle: {
    marginTop: 14,
    color: '#B5C8CE',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
    fontFamily: FONT_BODY,
  },
  infoCard: {
    marginTop: 28,
    borderRadius: 30,
    padding: 22,
    backgroundColor: 'rgba(7, 30, 42, 0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  infoEyebrow: {
    color: '#8ED2C8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  infoTitle: {
    marginTop: 10,
    color: '#F4FBFA',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  metricsRow: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  metricCard: {
    flex: 1,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  metricLabel: {
    marginTop: 4,
    color: '#8FA7AF',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 12,
  },
  loaderTrack: {
    marginTop: 24,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loaderGlow: {
    width: 120,
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#E9C46A',
  },
  loaderText: {
    marginTop: 14,
    color: '#C6D8DD',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  startButton: {
    marginTop: 20,
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    shadowColor: '#0A161C',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
});

export default LuncherScreen;
