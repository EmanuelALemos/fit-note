import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { updateCollection } from "@storage/storageQueue";
import { AppError } from "@utils/AppError";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export function exerciseUpdate(
    exerciseName: string,
    update: (exercise: ExerciseStorageDTO) => ExerciseStorageDTO
) {
    return updateCollection<ExerciseStorageDTO>(EXERCISE_COLLECTION, exercises => {
        if (!exercises.some(exercise => exercise.name === exerciseName)) {
            throw new AppError(`Exercício "${exerciseName}" não encontrado.`);
        }

        return exercises.map(exercise => exercise.name === exerciseName ? update(exercise) : exercise);
    });
}
