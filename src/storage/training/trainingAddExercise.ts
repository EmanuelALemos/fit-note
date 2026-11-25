import { AppError } from "@utils/AppError";

import { trainingUpdate } from "./trainingUpdate";

export function trainingAddExercise(trainingName: string, newExercise: string) {
    return trainingUpdate(trainingName, training => {
        if (training.exercicies.includes(newExercise)) {
            throw new AppError(`O exercício ${newExercise} já está no treino.`);
        }

        return { ...training, exercicies: [...training.exercicies, newExercise] };
    });
}
