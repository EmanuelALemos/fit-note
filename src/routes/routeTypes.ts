import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
    training: undefined;
    exercise: { trainingId: number; trainingName: string };
    series: { trainingId: number; exerciseId: number; exerciseName: string };
    summary: { sessionId: number };
    history: { exerciseId: number; exerciseName: string };
};

export type TrainingScreenProps = NativeStackScreenProps<RootStackParamList, 'training'>;
export type ExerciseScreenProps = NativeStackScreenProps<RootStackParamList, 'exercise'>;
export type SeriesScreenProps = NativeStackScreenProps<RootStackParamList, 'series'>;
export type SummaryScreenProps = NativeStackScreenProps<RootStackParamList, 'summary'>;
export type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'history'>;

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
