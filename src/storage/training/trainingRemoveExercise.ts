import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { trainingsGetAll } from "./trainingsGetAll";
import { AppError } from "@utils/AppError";

export async function trainingRemoveExercise(trainingName: string, exerciseToRemove: string) {
    try {
        // Recupera todos os treinos armazenados
        const storedTrainings = await trainingsGetAll();

        // Encontra o treino pelo nome
        const training = storedTrainings.find(
            (storedTraining) => storedTraining?.name === trainingName
        );

        // Se o treino não for encontrado, lança um erro
        if (!training) {
            throw new AppError('O treino especificado não foi encontrado.');
        }

        // Filtra os exercícios que não estão na lista de exercícios a serem removidos
        const updatedExercises = training.exercicies.filter( exercise => exercise !== exerciseToRemove );

        // Atualiza o treino com a nova lista de exercícios
        training.exercicies = updatedExercises;

        // Atualiza a lista de treinos
        const updatedTrainings = storedTrainings.map((storedTraining) =>
            storedTraining?.name === trainingName ? training : storedTraining
        );

        // Salva os treinos atualizados no AsyncStorage
        const storage = JSON.stringify(updatedTrainings);
        await AsyncStorage.setItem(TRAINING_COLLECTION, storage);
        
    } catch (error) {
        throw error;
    }
}
