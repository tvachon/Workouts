import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

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
// Left on its own, gifted-charts picks a y-axis max just above the data max,
// which lands the gridline steps on odd numbers or decimals. Instead, force
// each step to 1, 2, or 5 times a power of ten (…, 0.5, 1, 2, 5, 10, 20, …),
// trying a few section counts and keeping whichever wastes the least headroom.
function niceAxis(dataMax: number): { max: number; sections: number } {
  let best = { max: 4, sections: 4 };
  if (!Number.isFinite(dataMax) || dataMax <= 0) return best;
  best.max = Infinity;
  for (const sections of [4, 5, 6]) {
    const rough = dataMax / sections;
    const pow = 10 ** Math.floor(Math.log10(rough));
    let step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
    // Fractional steps only make sense when the data itself is fractional.
    if (dataMax >= 1 && step < 1) step = 1;
    if (step * sections < best.max) best = { max: step * sections, sections };
  }
  return best;
}

// Steps like 0.2 accumulate float noise ("0.6000000000000001"); trim it.
function cleanAxisLabel(label: string): string {
  const n = Number(label);
  return Number.isFinite(n) ? String(Number(n.toFixed(3))) : label;
}

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

  const axis = niceAxis(Math.max(...data.map((p) => p.value), 0));

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
          noOfSections={axis.sections}
          maxValue={axis.max}
          formatYLabel={cleanAxisLabel}
          adjustToWidth
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.raised,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    // `hidden` would clip the soft outer shadow; the chart already fits the card.
    overflow: 'visible',
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
