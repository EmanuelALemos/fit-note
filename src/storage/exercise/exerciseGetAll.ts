import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXERCISE_COLLECTION } from "@storage/storageConfig";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export async function exerciseGetAll() {

    try {
        const storage = await AsyncStorage.getItem(EXERCISE_COLLECTION);

        const exercises: ExerciseStorageDTO[] = storage ? JSON.parse(storage) : [];

        const exercisesFiltered = exercises.filter(exercise => exercise !== null && exercise !== undefined);

        return exercisesFiltered;
    } catch (error) {
        throw error;
    }
}