import { useEffect, useMemo, useRef, useState } from 'react';
import { Appearance } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import {
  DarkTheme as PaperDarkTheme,
  DefaultTheme as PaperDefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Merriweather_400Regular,
  Merriweather_700Bold,
  Merriweather_900Black,
} from '@expo-google-fonts/merriweather';
import RootStackNavigator from './src/navigations/RootStackNavigator';
import LocalStorage from './src/storage/LocalStorage';
import { setUnauthenticatedHandler } from './src/utils/authSession';
import notificationService from './src/utils/NotificationService';

export default function App() {
  const colorScheme = Appearance.getColorScheme();
  const [isThemeDark] = useState(colorScheme === 'dark');
  const navigationRef = useRef(null);
  const isSigningOutRef = useRef(false);
  const localStorage = useMemo(() => new LocalStorage(), []);
  const [fontsLoaded] = useFonts({
    Merriweather_400Regular,
    Merriweather_700Bold,
    Merriweather_900Black,
  });

  const theme = {
    ...(isThemeDark ? PaperDarkTheme : PaperDefaultTheme),
    roundness: 2,
    colors: {
      ...(isThemeDark ? PaperDarkTheme.colors : PaperDefaultTheme.colors),
      primary: '#3A8FAE',
    },
  };

  useEffect(() => {
    setUnauthenticatedHandler(async () => {
      if (isSigningOutRef.current) {
        return;
      }

      isSigningOutRef.current = true;

      try {
        await localStorage.deleteData('topLumUser');
        await localStorage.deleteData('current_user_id');

        if (navigationRef.current?.isReady?.()) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } finally {
        isSigningOutRef.current = false;
      }
    });

    // Initialiser les permissions de notification
    notificationService.requestPermissions();
  }, [localStorage]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <NavigationContainer ref={navigationRef}>
            <RootStackNavigator />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
