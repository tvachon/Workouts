import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { DumbbellIcon } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { messageOf } from '../../utils/errors';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          Alert.alert(
            'Confirm your email',
            'Check your inbox for a confirmation link, then sign in.',
          );
          setMode('signin');
        }
        // Otherwise a session was created and the auth listener navigates in.
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.header}>
        <DumbbellIcon size={48} color={COLORS.primary} strokeWidth={2.2} />
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

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
  error: {
    color: COLORS.danger,
    fontSize: FONT.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SPACING.md,
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
