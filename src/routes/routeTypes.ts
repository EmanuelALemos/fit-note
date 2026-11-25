import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
    training: undefined;
    exercise: { trainingName: string };
    series: { exerciseName: string };
};

export type TrainingScreenProps = NativeStackScreenProps<RootStackParamList, 'training'>;
export type ExerciseScreenProps = NativeStackScreenProps<RootStackParamList, 'exercise'>;
export type SeriesScreenProps = NativeStackScreenProps<RootStackParamList, 'series'>;

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootStackParamList { }
    }
}
