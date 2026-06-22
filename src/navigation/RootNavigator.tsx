import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types/navigation.types';
import { AppTabs } from './AppTabs';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ExerciseDetailScreen } from '../screens/exercises/ExerciseDetailScreen';
import { ExerciseFormScreen } from '../screens/exercises/ExerciseFormScreen';
import { LogEntryScreen } from '../screens/log/LogEntryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { color: COLORS.text },
        headerTintColor: COLORS.primary,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {session ? (
        <>
          <Stack.Screen
            name="Tabs"
            component={AppTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ExerciseDetail"
            component={ExerciseDetailScreen}
            options={{ title: 'Exercise' }}
          />
          <Stack.Screen
            name="ExerciseForm"
            component={ExerciseFormScreen}
            options={{ title: 'Exercise', presentation: 'modal' }}
          />
          <Stack.Screen
            name="LogEntry"
            component={LogEntryScreen}
            options={{ title: 'Log Workout', presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
