import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import DashbordScreen from '../screens/DashbordScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddEntryScreen from '../screens/AddEntryScreen';
import ReportScreen from '../screens/ReportScreen';
import LuncherScreen from '../screens/LuncherScreen';
import NotificationScreen from '../screens/NotificationScreen';
import DetaisTransactionScreen from '../screens/DetaisTransactionScreen';

const Stack = createNativeStackNavigator();

function RootStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Launcher"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: '#0A2230' },
      }}
    >
      <Stack.Screen
        name="Launcher"
        component={LuncherScreen}
        options={{
          animation: 'fade',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="Projects"
        component={DashbordScreen}
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen name="Activities" component={ActivitiesScreen} />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="AddEntry"
        component={AddEntryScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="DetailTransaction" component={DetaisTransactionScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
    </Stack.Navigator>
  );
}

export default RootStackNavigator;
