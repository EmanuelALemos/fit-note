import { exerciseUpdate } from "./exerciseUpdate";

export function exerciseAddSerie(exerciseName: string) {
    return exerciseUpdate(exerciseName, exercise => ({
        ...exercise,
        series: [...exercise.series, {
            repetitions: 0,
            exerciseId: exerciseName,
            // Mantém o formato já gravado; o rótulo "1ª série" é montado na tela.
            name: `${exercise.series.length + 1}° série`,
        }],
    }));
}
