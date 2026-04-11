import AsyncStorage from "@react-native-async-storage/async-storage";

import { TRAINING_COLLECTION } from "@storage/storageConfig";

import { trainingsGetAll } from "./trainingsGetAll";
import { exerciseRemoveAll } from "@storage/exercise/exerciseRemoveAll";


export async function trainingRemoveByName(trainingDeleted: string) {
    try{
        const storedTrainings = await trainingsGetAll();

        if(storedTrainings.length === 1){
            await exerciseRemoveAll();
        }
        const trainings = storedTrainings.filter(training => training?.name !== trainingDeleted);

        await AsyncStorage.setItem(TRAINING_COLLECTION, JSON.stringify(trainings))
    }catch(error){
        throw error;
    }
}