import type { NavigatorScreenParams } from '@react-navigation/native';

export type AppTabsParamList = {
  Today: undefined;
  Exercises: undefined;
  Routine: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<AppTabsParamList> | undefined;
  ExerciseDetail: { exerciseId: string };
  ExerciseForm: { exerciseId?: string };
  LogEntry: { exerciseId: string; performedOn?: string };
};
