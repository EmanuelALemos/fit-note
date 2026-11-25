import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { readCollection } from "@storage/storageQueue";

import { TrainingStorageDTO } from "./TrainingStorageDTO";

export function trainingsGetAll() {
    return readCollection<TrainingStorageDTO>(TRAINING_COLLECTION);
}
