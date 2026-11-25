import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { updateCollection } from "@storage/storageQueue";
import { AppError } from "@utils/AppError";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export function exerciseCreate(newExercise: ExerciseStorageDTO) {
    return updateCollection<ExerciseStorageDTO>(EXERCISE_COLLECTION, exercises => {
        if (exercises.some(exercise => exercise.name === newExercise.name)) {
            throw new AppError('Já existe um Exercício cadastrado com esse nome.');
        }

        return [...exercises, newExercise];
    });
}
