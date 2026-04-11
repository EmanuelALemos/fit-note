import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXERCISE_COLLECTION } from "@storage/storageConfig";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";
import { exerciseGetByName } from "./exerciseGetByName";

export async function exerciseEditLoad(exerciseName: string, load: number) {
    try {
        // Pegar o exercício pelo nome
        const exercise = await exerciseGetByName(exerciseName);

        if (!exercise) {
            throw new Error(`Não econtramos o exercicio ${exerciseName}`);
        }

        // Atualizar o valor do load do exercício
        exercise.load = load;

        // Buscar exercícios armazenados
        const storedExercises = await AsyncStorage.getItem(EXERCISE_COLLECTION);
        
        // Garantir que `exercises` será sempre um array válido
        let exercises: ExerciseStorageDTO[] = [];

        if (storedExercises) {
            try {
                exercises = JSON.parse(storedExercises);

                // Garantir que o valor após o JSON.parse é um array
                if (!Array.isArray(exercises)) {
                    throw new Error("Stored exercises is not an array.");
                }
            } catch (error) {
                console.error("Failed to parse stored exercises:", error);
                // Lidar com dados corrompidos ou formato inesperado
                exercises = [];
            }
        }

        // Filtrar para remover o exercício com o nome correspondente
        const exercisesFiltered = exercises.filter(item => item.name !== exerciseName);

        // Armazenar a nova lista com o exercício atualizado
        const storage = JSON.stringify([...exercisesFiltered, exercise]);

        await AsyncStorage.setItem(EXERCISE_COLLECTION, storage);
    } catch (error) {
        throw error;
    }
}
