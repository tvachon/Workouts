import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, MAX_CONTENT_WIDTH, SPACING } from '../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}

/**
 * Standard screen wrapper: safe-area aware, themed background, and content
 * capped at MAX_CONTENT_WIDTH and centered so the app stays phone-scaled on
 * desktop web (same trick as Watchtimer).
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
}: ScreenProps) {
  const inner = (
    <View style={[styles.inner, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
              />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.flexContent}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.lg,
  },
  flexContent: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    flex: 1,
  },
});
