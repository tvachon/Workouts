import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import {
  createExercise,
  deleteExercise,
  getExercise,
  updateExercise,
} from '../../api/exercises';
import type { WeightUnit } from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Form = RouteProp<RootStackParamList, 'ExerciseForm'>;

export function ExerciseFormScreen({ route }: { route: Form }) {
  const navigation = useNavigation<Nav>();
  const exerciseId = route.params?.exerciseId;
  const isEdit = !!exerciseId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('lb');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!exerciseId) return;
    getExercise(exerciseId)
      .then((ex) => {
        if (ex) {
          setName(ex.name);
          setDescription(ex.description ?? '');
          setUnit(ex.unit);
        }
      })
      .catch((e) => Alert.alert('Error', messageOf(e)))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the exercise a name.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        unit,
      };
      if (isEdit && exerciseId) {
        await updateExercise(exerciseId, input);
      } else {
        await createExercise(input);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!exerciseId) return;
    Alert.alert(
      'Delete exercise?',
      'This permanently deletes the exercise and all its logged workouts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(exerciseId);
              navigation.navigate('Tabs', { screen: 'Exercises' });
            } catch (e) {
              Alert.alert('Delete failed', messageOf(e));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.heading}>{isEdit ? 'Edit exercise' : 'New exercise'}</Text>

      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Bench Press"
        autoCapitalize="words"
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Any cues or details"
        multiline
      />

      <Text style={styles.label}>Weight unit</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={unit}
          onValueChange={(v) => setUnit(v as WeightUnit)}
        >
          <Picker.Item label="Pounds (lb)" value="lb" />
          <Picker.Item label="Kilograms (kg)" value="kg" />
        </Picker>
      </View>

      <Button
        title={isEdit ? 'Save changes' : 'Create exercise'}
        onPress={save}
        loading={saving}
        style={styles.save}
      />

      {isEdit ? (
        <Button title="Delete exercise" variant="danger" onPress={confirmDelete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  pickerWrap: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  save: {
    marginBottom: SPACING.md,
  },
  loading: {
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
  },
});
