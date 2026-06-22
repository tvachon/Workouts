import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from '../constants/theme';
import type { AppTabsParamList } from '../types/navigation.types';
import { TodayScreen } from '../screens/today/TodayScreen';
import { ExerciseListScreen } from '../screens/exercises/ExerciseListScreen';
import { RoutineScreen } from '../screens/routine/RoutineScreen';

const Tab = createBottomTabNavigator<AppTabsParamList>();

const ICONS: Record<keyof AppTabsParamList, string> = {
  Today: '📅',
  Exercises: '🏋️',
  Routine: '🗓️',
};

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.surface },
        headerTitleStyle: { color: COLORS.text },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.6 }}>
            {ICONS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen
        name="Exercises"
        component={ExerciseListScreen}
        options={{ title: 'Exercises' }}
      />
      <Tab.Screen name="Routine" component={RoutineScreen} />
    </Tab.Navigator>
  );
}
