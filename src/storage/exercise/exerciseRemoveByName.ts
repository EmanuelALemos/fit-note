import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXERCISE_COLLECTION } from "@storage/storageConfig";

import { exerciseGetAll } from "./exerciseGetAll";


export async function exerciseRemoveByName(exerciseDeleted: string) {
    try{
        const storedExercise = await exerciseGetAll();
        const exercise = storedExercise.filter(exercise => exercise?.name !== exerciseDeleted);

        await AsyncStorage.setItem(EXERCISE_COLLECTION, JSON.stringify(exercise))
    }catch(error){
        throw error;
    }
}