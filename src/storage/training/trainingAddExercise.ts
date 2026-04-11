import AsyncStorage from "@react-native-async-storage/async-storage";
import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { trainingsGetAll } from "./trainingsGetAll";
import { AppError } from "@utils/AppError";

export async function trainingAddExercise(trainingName: string, newExercise: string) {
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

        // Verifica se os exercícios já existem no treino
        const duplicateExercises = training.exercicies.filter(exercise => exercise === newExercise);
        
        // Se houver exercícios duplicados, lança um erro
        if (duplicateExercises.length > 0) {
            throw new AppError(`Os seguintes exercícios já estão no treino: ${duplicateExercises.join(', ')}`);
        }

        // Adiciona os novos exercícios ao treino existente
        training.exercicies = [...training.exercicies, newExercise];

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
