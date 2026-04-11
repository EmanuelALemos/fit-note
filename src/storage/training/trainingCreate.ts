import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { trainingsGetAll } from "./trainingsGetAll";
import { AppError } from "@utils/AppError";
import { TrainingStorageDTO } from "./TrainingStorageDTO";

export async function trainingCreate(newTraining: TrainingStorageDTO) {
    try{

        const storedTrainings = await trainingsGetAll();


        const trainingAlreadyExists = storedTrainings.some(
            (training: TrainingStorageDTO) => training?.name === newTraining.name
        );

        if(trainingAlreadyExists){
            throw new AppError('Já existe um Treino cadastrado com esse nome.');
        }

        const storage = JSON.stringify([...storedTrainings, newTraining])
        await AsyncStorage.setItem(TRAINING_COLLECTION, storage);

    }catch(error){
        throw error;
    }
    
}