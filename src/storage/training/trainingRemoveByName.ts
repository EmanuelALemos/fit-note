import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { updateCollection } from "@storage/storageQueue";

import { TrainingStorageDTO } from "./TrainingStorageDTO";

// Remove só o treino: os exercícios e as cargas são compartilhados e continuam salvos.
export function trainingRemoveByName(trainingDeleted: string) {
    return updateCollection<TrainingStorageDTO>(TRAINING_COLLECTION, trainings =>
        trainings.filter(training => training.name !== trainingDeleted)
    );
}
