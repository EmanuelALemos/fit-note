import { AppError } from "@utils/AppError";

import { exerciseUpdate } from "./exerciseUpdate";

// A série é identificada pela posição: o nome gravado pode ter "°" ou se repetir.
export function exerciseChangeRepetitions(exerciseName: string, serieIndex: number, delta: number) {
    return exerciseUpdate(exerciseName, exercise => {
        if (!exercise.series[serieIndex]) {
            throw new AppError('Série não encontrada.');
        }

        return {
            ...exercise,
            series: exercise.series.map((serie, index) => index === serieIndex
                ? { ...serie, repetitions: Math.max(0, serie.repetitions + delta) }
                : serie
            ),
        };
    });
}
