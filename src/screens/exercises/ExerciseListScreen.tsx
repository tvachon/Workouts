import React, { useCallback, useLayoutEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { ExerciseCard } from '../../components/ExerciseCard';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { useExercises } from '../../hooks/useExercises';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../types/navigation.types';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ExerciseListScreen() {
  const navigation = useNavigation<Nav>();
  const { exercises, loading, error, refresh } = useExercises();
  const { signOut } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={async () => {
            try {
              await signOut();
            } catch (e) {
              Alert.alert('Sign out failed', messageOf(e));
            }
          }}
          style={styles.headerBtn}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('ExerciseForm', {})}
          style={styles.headerBtn}
        >
          <Text style={styles.add}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut]);

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      {loading && exercises.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : exercises.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No exercises yet.</Text>
          <Text style={styles.emptyHint}>
            Tap ＋ to add your first exercise.
          </Text>
        </View>
      ) : (
        exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onPress={() =>
              navigation.navigate('ExerciseDetail', { exerciseId: ex.id })
            }
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: SPACING.xxl,
  },
  error: {
    color: COLORS.danger,
    marginTop: SPACING.lg,
  },
  empty: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  headerBtn: {
    paddingHorizontal: SPACING.md,
  },
  signOut: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
  },
  add: {
    color: COLORS.primary,
    fontSize: FONT.xxl,
    fontWeight: '600',
  },
});
