import { exerciseUpdate } from "./exerciseUpdate";

export function exerciseRemoveLastSerie(exerciseName: string) {
    return exerciseUpdate(exerciseName, exercise => ({
        ...exercise,
        series: exercise.series.slice(0, -1),
    }));
}
