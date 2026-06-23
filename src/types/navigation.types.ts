import type { NavigatorScreenParams } from '@react-navigation/native';

export type AppTabsParamList = {
  Week: undefined;
  Exercises: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<AppTabsParamList> | undefined;
  ExerciseDetail: { exerciseId: string };
  ExerciseForm: { exerciseId?: string };
  LogEntry: { exerciseId: string; performedOn?: string };
};
