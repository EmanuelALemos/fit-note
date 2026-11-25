import { EXERCISE_COLLECTION } from "@storage/storageConfig";
import { readCollection } from "@storage/storageQueue";

import { ExerciseStorageDTO } from "./ExerciseStorageDTO";

export function exerciseGetAll() {
    return readCollection<ExerciseStorageDTO>(EXERCISE_COLLECTION);
}
