import AsyncStorage from "@react-native-async-storage/async-storage";
import { EXERCISE_COLLECTION } from "@storage/storageConfig";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";
import { AppError } from "@utils/AppError";
import { exerciseGetAll } from "./exerciseGetAll";

export async function exerciseCreate(newExercise: ExerciseStorageDTO) {
    try{
        const storedExercises = await exerciseGetAll();

        const exerciseAlreadyExists = storedExercises.some(
            (exercise: ExerciseStorageDTO) => exercise?.name === newExercise.name
        );

        if(exerciseAlreadyExists){
            return new AppError('Já existe um Exercício cadastrado com esse nome.');
        }

        const storage = JSON.stringify([...storedExercises, newExercise])
        await AsyncStorage.setItem(EXERCISE_COLLECTION, storage);
    }catch(error){
        throw error;
    }
}