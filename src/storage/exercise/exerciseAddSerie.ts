import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXERCISE_COLLECTION } from "@storage/storageConfig";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";
import { SeriesStorageDTO } from "@storage/series/SeriesStorageDTO";
import { exerciseGetByName } from "./exerciseGetByName";

export async function exerciseAddSerie(exerciseName: string, newSerie: SeriesStorageDTO) {
    try {
        // Verifica se o exercício existe
        const exercise = await exerciseGetByName(exerciseName);

        if (!exercise) {
            throw new Error(`Exercício com o nome ${exerciseName} não encontrado`);
        }

        // Adiciona a nova série ao exercício existente
        exercise.series.push(newSerie);

        // Recupera os exercícios armazenados
        const storedExercises = await AsyncStorage.getItem(EXERCISE_COLLECTION);

        // Converte os exercícios armazenados ou inicia um array vazio
        let exercises: ExerciseStorageDTO[] = storedExercises ? JSON.parse(storedExercises) : [];

        // Garante que exercises seja um array
        if (!Array.isArray(exercises)) {
            console.error("exercises não é um array. Valor atual:", exercises); // Depuração
            throw new Error("Dados armazenados em EXERCISE_COLLECTION não são um array");
        }

        // Filtra os exercícios removendo o atual (que será atualizado)
        const exercisesFiltered = exercises.filter(exercise => exercise.name !== exerciseName);


        // Atualiza a lista de exercícios com o exercício modificado
        const storage = JSON.stringify([...exercisesFiltered, exercise]);

        // Armazena os exercícios atualizados
        await AsyncStorage.setItem(EXERCISE_COLLECTION, storage);
        
    } catch (error) {
        console.error("Erro no processo:", error); // Depuração
        throw error;
    }
}
