import { exerciseGetAll } from "./exerciseGetAll";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export async function exerciseGetByName(name: string) {
    try {
        const storedExercises = await exerciseGetAll();

        const exercise = storedExercises.find(
            (exercise: ExerciseStorageDTO) => exercise?.name === name
        );

        return exercise;
    } catch (error) {
        throw error;
    }
}