import AsyncStorage from "@react-native-async-storage/async-storage";
import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export async function exerciseRemoveAll() {
    try{
        const exercises: ExerciseStorageDTO[]= []


        const storage = JSON.stringify(exercises)
        AsyncStorage.setItem(EXERCISE_COLLECTION, storage)

    }catch(error){
        throw error;
    }
}