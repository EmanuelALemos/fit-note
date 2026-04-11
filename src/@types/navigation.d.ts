import { StackNavigationProp } from '@react-navigation/stack';

export declare global {
    namespace ReactNavigation {
        interface RootParamiList {
           exercice: { trainingName: string };
           series: { exerciseName: string };
        }
    }
}


export declare global {
    type ExerciseScreenNavigationProp = StackNavigationProp<RootParamiList, 'exercice'>;

    type SeriesScreenNavigationProp = StackNavigationProp<RootParamiList, 'series'>;
}