import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
    training: undefined;
    exercise: { trainingId: number; trainingName: string };
    series: { exerciseId: number; exerciseName: string };
};

export type TrainingScreenProps = NativeStackScreenProps<RootStackParamList, 'training'>;
export type ExerciseScreenProps = NativeStackScreenProps<RootStackParamList, 'exercise'>;
export type SeriesScreenProps = NativeStackScreenProps<RootStackParamList, 'series'>;

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
