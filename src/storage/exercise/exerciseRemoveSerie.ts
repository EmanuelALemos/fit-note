import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { exerciseGetByName } from "./exerciseGetByName";
import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export async function exerciseRemoveSerie(exerciseId: string, serieId: string) {
    try {
        // Recupera a lista de exercícios armazenados
        const storedExercises = await AsyncStorage.getItem(EXERCISE_COLLECTION);
        const exercises: ExerciseStorageDTO[] = storedExercises ? JSON.parse(storedExercises) : [];

        // Encontra o exercício que corresponde ao exerciseId
        const exercise = exercises.find(exercise => exercise.name === exerciseId);

        if (!exercise) {
            throw new Error(`Exercício com o ID ${exerciseId} não encontrado`);
        }

        // Filtra as séries para remover a série que corresponde ao serieId
        const updatedSeries = exercise.series.filter(serie => serie.name !== serieId);

        // Atualiza o exercício com a nova lista de séries
        const updatedExercise = {
            ...exercise,
            series: updatedSeries
        };

        // Filtra a lista de exercícios para remover o exercício antigo
        const updatedExercises = exercises.map(ex => ex.name === exerciseId ? updatedExercise : ex);

        // Armazena a lista de exercícios atualizada no AsyncStorage
        await AsyncStorage.setItem(EXERCISE_COLLECTION, JSON.stringify(updatedExercises));

    } catch (error) {
        console.error("Erro ao remover série:", error);
        throw error;
    }
}
