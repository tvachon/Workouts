export type RootStackParamList = {
  Login: undefined;
  Week: undefined;
  // exerciseId present = edit existing (shows charts + history); absent = create new.
  Exercise: { exerciseId?: string };
  LogEntry: { exerciseId: string; performedOn?: string };
};
