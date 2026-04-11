import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { trainingsGetAll } from "./trainingsGetAll";
import { AppError } from "@utils/AppError";
import { TrainingStorageDTO } from "./TrainingStorageDTO";

export async function trainingEdit(oldTraining: TrainingStorageDTO, newTraining: TrainingStorageDTO) {
    try {
        const storedTrainings = await trainingsGetAll();
       
        // Verifica se o nome do novo treino já existe, exceto pelo treino que está sendo editado
        const trainingAlreadyExists = storedTrainings.some(
            (training) => training?.name === newTraining.name && training?.name !== oldTraining.name
        );


        if (trainingAlreadyExists) {
            throw new AppError('Já existe um Treino cadastrado com esse nome.');
        }

        // Substitui o treino antigo pelo novo
        const updatedTrainings = storedTrainings.map((training) =>
            training?.name === oldTraining.name ? newTraining : training
        );


        // Salva os treinos atualizados no AsyncStorage
        const storage = JSON.stringify(updatedTrainings);
        await AsyncStorage.setItem(TRAINING_COLLECTION, storage);
    } catch (error) {
        throw error;
    }
}
