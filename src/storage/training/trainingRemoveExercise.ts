import { trainingUpdate } from "./trainingUpdate";

export function trainingRemoveExercise(trainingName: string, exerciseToRemove: string) {
    return trainingUpdate(trainingName, training => ({
        ...training,
        exercicies: training.exercicies.filter(exercise => exercise !== exerciseToRemove),
    }));
}
