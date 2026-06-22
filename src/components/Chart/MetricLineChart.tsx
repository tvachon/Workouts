import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';

export interface ChartPoint {
  value: number;
  /** Full date label, e.g. '6/22'. Thinned automatically before rendering. */
  label: string;
}

interface MetricLineChartProps {
  title: string;
  data: ChartPoint[];
  color: string;
  /** Unit suffix shown in the title, e.g. 'lb'. */
  unit?: string;
}

const CHART_HEIGHT = 200;
const MAX_LABELS = 6;

export function MetricLineChart({
  title,
  data,
  color,
  unit,
}: MetricLineChartProps) {
  const [width, setWidth] = useState(0);

  // Show a label on at most MAX_LABELS evenly spaced points to avoid crowding.
  const labelEvery = Math.max(1, Math.ceil(data.length / MAX_LABELS));
  const points = data.map((p, i) => ({
    value: p.value,
    label: i % labelEvery === 0 ? p.label : undefined,
    dataPointText: undefined,
  }));

  const initialSpacing = 12;
  const endSpacing = 12;
  const yAxisWidth = 36;
  const usable = Math.max(0, width - yAxisWidth - initialSpacing - endSpacing);
  const spacing =
    points.length > 1 ? usable / (points.length - 1) : usable || 40;

  return (
    <View style={styles.card} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Text style={styles.title}>
        {title}
        {unit ? <Text style={styles.unit}> ({unit})</Text> : null}
      </Text>

      {data.length === 0 ? (
        <Text style={styles.empty}>No data yet.</Text>
      ) : width === 0 ? (
        // Wait for layout so the chart can be sized to the container.
        <View style={{ height: CHART_HEIGHT }} />
      ) : (
        <LineChart
          data={points}
          height={CHART_HEIGHT}
          width={usable}
          initialSpacing={initialSpacing}
          endSpacing={endSpacing}
          spacing={spacing}
          color={color}
          thickness={2}
          dataPointsColor={color}
          dataPointsRadius={3}
          yAxisColor={COLORS.border}
          xAxisColor={COLORS.border}
          rulesColor={COLORS.surfaceAlt}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisText}
          yAxisLabelWidth={yAxisWidth}
          noOfSections={4}
          adjustToWidth
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  title: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  unit: {
    fontSize: FONT.sm,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  empty: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    paddingVertical: SPACING.xl,
    textAlign: 'center',
  },
  axisText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
