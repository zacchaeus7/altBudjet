import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../apis/API';
import LocalStorage from '../storage/LocalStorage';
import { FONT_BODY, FONT_DISPLAY, FONT_HEADING } from '../theme/typography';


 function LoginScreen({ navigation }) {

  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureEntry, setSecureEntry] = useState(true);
  const [isProgress, setIsProgress] = useState(false);

  const api = useMemo(() => new API(), []);
  const localStorage = useMemo(() => new LocalStorage(), []);

  const isDisabled = useMemo(() => {
    return isProgress || username.trim().length === 0 || password.trim().length === 0;
  }, [isProgress, password, username]);

  const showError = (message) => {
    Alert.alert('Erreur de connexion', message);
  };

  const extractApiErrorMessage = (error) => {
    if (error?.message?.includes('Native module is null')) {
      return 'Le stockage local n est pas disponible dans cette build. Installe une version AsyncStorage compatible avec Expo puis redemarre l application.';
    }

    const apiMessage =
      error?.details?.message ||
      error?.details?.error ||
      error?.details?.errors?.email?.[0] ||
      error?.details?.errors?.username?.[0] ||
      error?.details?.errors?.password?.[0] ||
      error?.message;

    if (error?.status === 401) {
      return apiMessage || 'Identifiants invalides. Reessayez.';
    }

    if (error?.status === 408) {
      return 'Le serveur met trop de temps a repondre. Reessayez.';
    }

    if (error?.status === 422) {
      return apiMessage || 'Certains champs sont invalides.';
    }

    if (error?.status >= 500) {
      return 'Le serveur rencontre un probleme. Reessayez plus tard.';
    }

    if (error?.status === 0) {
      return 'Impossible de joindre le serveur. Verifiez votre connexion et l\'URL de l\'API.';
    }

    return apiMessage || 'Une erreur est survenue. Reessayez.';
  };

  const handleLogin = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password.trim()) {
      showError('Renseignez votre nom d\'utilisateur et votre mot de passe.');
      return;
    }

    const data = {
      email: trimmedUsername,
      password: password,
    };

    setIsProgress(true);

    try {
      const response = await api.send(data, 'login');

      if (response?.status === true || response?.access_token) {
        await localStorage.storeData('topLumUser', response);

        // Stocker l'ID de l'utilisateur connecté pour les notifications
        const userId = response?.user?.id || response?.user_id;
        if (userId) {
          await localStorage.storeCurrentUserId(userId);
        }

        if (navigation?.getState?.()?.routeNames?.includes('Projects')) {
          navigation.navigate('Projects', { user: response.user });
          return;
        }

        showError('Connexion reussie, mais la page dashboard n\'est pas encore disponible.');
      } else {
        showError(
          response?.message ||
          response?.error ||
          'Identifiants invalides. Reessayez.'
        );
      }
    } catch (error) {
      showError(extractApiErrorMessage(error));
    } finally {
      setIsProgress(false);
    }
  };

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.background}>
        <View style={styles.glowPrimary} />
        <View style={styles.glowSecondary} />
        <View style={styles.gridLineOne} />
        <View style={styles.gridLineTwo} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBlock}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Alternatives plus</Text>
            </View>

            <Text style={styles.heroTitle}>Connexion a la caisse mensuelle</Text>

            <Text style={styles.heroSubtitle}>
              Suivez les depenses de la caissiere, centralisez les operations du mois
              et gardez une vision claire de la petite caisse.
            </Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryLabel}>Tableau de suivi</Text>
                <Text style={styles.summaryMonth}>Mensuel</Text>
              </View>

              <Text style={styles.summaryAmount}>Petite caisse</Text>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>Depenses</Text>
                  <Text style={styles.summaryStatLabel}>Enregistrées</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>Equipe</Text>
                  <Text style={styles.summaryStatLabel}>Autorisee</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formEyebrow}>Acces securise</Text>
            <Text style={styles.formTitle}>Se connecter</Text>
            <Text style={styles.formSubtitle}>
              Entrez vos identifiants pour acceder au suivi des mouvements de caisse.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isProgress}
                onChangeText={setUsername}
                placeholder="Ex. caissiere.ap"
                placeholderTextColor="#7B8A93"
                selectionColor="#0F766E"
                style={styles.input}
                value={username}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSecureEntry((prev) => !prev)}>
                  <Text style={styles.toggleText}>
                    {secureEntry ? 'Afficher' : 'Masquer'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isProgress}
                onSubmitEditing={handleLogin}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                placeholderTextColor="#7B8A93"
                returnKeyType="done"
                secureTextEntry={secureEntry}
                selectionColor="#0F766E"
                style={styles.input}
                value={password}
              />
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.helperRow}>
              <Text style={styles.helperText}>Mot de passe oublie ?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isDisabled}
              onPress={handleLogin}
              style={[styles.loginButton, isDisabled && styles.loginButtonDisabled]}
            >
              <Text style={styles.loginButtonText}>
                {isProgress ? 'Connexion en cours...' : 'Ouvrir le tableau de caisse'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Reservé a l'equipe habilitée pour la gestion des depenses mensuelles.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A2230',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A2230',
  },
  glowPrimary: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(42, 157, 143, 0.28)',
  },
  glowSecondary: {
    position: 'absolute',
    bottom: 140,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(233, 196, 106, 0.14)',
  },
  gridLineOne: {
    position: 'absolute',
    top: 160,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gridLineTwo: {
    position: 'absolute',
    top: 260,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    justifyContent: 'space-between',
  },
  heroBlock: {
    paddingTop: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBadgeText: {
    color: '#E7F4F3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  heroTitle: {
    marginTop: 18,
    color: '#F6FBFA',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    fontFamily: FONT_DISPLAY,
  },
  heroSubtitle: {
    marginTop: 14,
    color: '#B6C8CD',
    fontSize: 15,
    lineHeight: 24,
    maxWidth: '92%',
    fontFamily: FONT_BODY,
  },
  summaryCard: {
    marginTop: 28,
    borderRadius: 28,
    padding: 20,
    backgroundColor: 'rgba(8, 28, 39, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#CDE3E2',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  summaryMonth: {
    color: '#0A2230',
    backgroundColor: '#E9C46A',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  summaryAmount: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  summaryStats: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  summaryStat: {
    flex: 1,
  },
  summaryStatValue: {
    color: '#F1F7F7',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  summaryStatLabel: {
    marginTop: 4,
    color: '#8AA1A9',
    fontSize: 12,
    fontFamily: FONT_BODY,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 10,
  },
  formCard: {
    marginTop: 28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 22,
    backgroundColor: '#F6F8F7',
  },
  formEyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: FONT_HEADING,
  },
  formTitle: {
    marginTop: 10,
    color: '#102A35',
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  formSubtitle: {
    marginTop: 8,
    color: '#5C7078',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_BODY,
  },
  inputGroup: {
    marginTop: 18,
  },
  inputLabel: {
    marginBottom: 9,
    color: '#23404A',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  input: {
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E1E3',
    color: '#102A35',
    fontSize: 15,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONT_HEADING,
  },
  helperRow: {
    marginTop: 14,
    alignSelf: 'flex-end',
  },
  helperText: {
    color: '#40606A',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT_BODY,
  },
  loginButton: {
    marginTop: 22,
    minHeight: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.55,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONT_HEADING,
  },
  footerNote: {
    marginTop: 16,
    color: '#738791',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: FONT_BODY,
  },
});

export default LoginScreen;
