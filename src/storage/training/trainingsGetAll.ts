import AsyncStorage from "@react-native-async-storage/async-storage";

import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { TrainingStorageDTO } from "./TrainingStorageDTO";

export async function trainingsGetAll() {
    
    try{
        const storage = await AsyncStorage.getItem(TRAINING_COLLECTION);

        const trainings: TrainingStorageDTO[] = storage ? JSON.parse(storage): []; 

        const trainingsFiltered = trainings.filter(training => training !== null && training !== undefined);

        return trainingsFiltered;
    } catch(error){
        throw error;
    }
}