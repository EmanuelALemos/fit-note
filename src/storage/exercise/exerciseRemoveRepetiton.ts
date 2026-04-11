import AsyncStorage from "@react-native-async-storage/async-storage";
import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export async function exerciseRemoveRepetition(exerciseId: string, serieName: string) {
    try {
        // Recupera os exercícios armazenados
        const storedExercises = await AsyncStorage.getItem(EXERCISE_COLLECTION);
        const exercises: ExerciseStorageDTO[] = storedExercises ? JSON.parse(storedExercises) : [];

        // Encontra o exercício correspondente
        const exercise = exercises.find(ex => ex.name === exerciseId);
        if (!exercise) {
            throw new Error(`Exercício com o ID ${exerciseId} não encontrado`);
        }

        // Encontra a série específica
        const serie = exercise.series.find(s => s.name === serieName);
        if (!serie) {
            throw new Error(`Série com o nome ${serieName} não encontrada no exercício ${exerciseId}`);
        }

        // Adiciona as repetições à série
        serie.repetitions--;
        // Atualiza a lista de exercícios no AsyncStorage
        await AsyncStorage.setItem(EXERCISE_COLLECTION, JSON.stringify(exercises));
    } catch (error) {
        console.error("Erro ao adicionar repetições:", error);
        throw error;
    }
}
