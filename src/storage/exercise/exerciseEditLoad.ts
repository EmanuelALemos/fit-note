import { exerciseUpdate } from "./exerciseUpdate";

export function exerciseEditLoad(exerciseName: string, load: number) {
    return exerciseUpdate(exerciseName, exercise => ({ ...exercise, load }));
}
