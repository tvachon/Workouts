import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { COLORS } from '../../constants/theme';

/**
 * A small set of stroke-based line icons (Feather-style: 24×24 viewBox, round
 * caps/joins) that replace the app's former emoji/glyph icons. Each takes a
 * `size` and `color` so it inherits from its surrounding text context.
 */
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function Icon({
  size = 20,
  color = COLORS.text,
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Barbell — app logo. Two plates per side joined by a handle. */
export function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Line x1={4} y1={9} x2={4} y2={15} />
      <Line x1={7} y1={6.5} x2={7} y2={17.5} />
      <Line x1={7} y1={12} x2={17} y2={12} />
      <Line x1={17} y1={6.5} x2={17} y2={17.5} />
      <Line x1={20} y1={9} x2={20} y2={15} />
    </Icon>
  );
}

/** Rising line chart — opens an exercise's history graphs. */
export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <Polyline points="16 7 22 7 22 13" />
    </Icon>
  );
}

/** Checkmark — a row saved successfully. */
export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

/** Circled exclamation — a row failed to save. */
export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={10} />
      <Line x1={12} y1={8} x2={12} y2={12} />
      <Line x1={12} y1={16} x2={12.01} y2={16} />
    </Icon>
  );
}

/** Close / remove. */
export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </Icon>
  );
}

/** Right-pointing chevron — collapsed disclosure affordance. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}

/** Plus — add a new item. */
export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Icon>
  );
}

/** Down arrow — points to the day list below. */
export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Polyline points="19 12 12 19 5 12" />
    </Icon>
  );
}

/** Grip / menu lines — drag handle for reordering. */
export function GripIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Line x1={3} y1={6} x2={21} y2={6} />
      <Line x1={3} y1={12} x2={21} y2={12} />
      <Line x1={3} y1={18} x2={21} y2={18} />
    </Icon>
  );
}
