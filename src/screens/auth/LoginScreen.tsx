import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { messageOf } from '../../utils/errors';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        Alert.alert(
          'Check your email',
          'If email confirmation is enabled for your project, confirm your address, then sign in.',
        );
        setMode('signin');
      }
    } catch (e) {
      Alert.alert(
        mode === 'signin' ? 'Sign in failed' : 'Sign up failed',
        messageOf(e),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.header}>
        <Text style={styles.logo}>🏋️</Text>
        <Text style={styles.appName}>Workouts</Text>
        <Text style={styles.tagline}>Track lifts. Watch progress.</Text>
      </View>

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
      />

      <Button
        title={mode === 'signin' ? 'Sign in' : 'Create account'}
        onPress={submit}
        loading={submitting}
      />

      <Pressable
        onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>
          {mode === 'signin'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontSize: 48,
  },
  appName: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  tagline: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  toggle: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: FONT.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
