import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { updateCollection } from "@storage/storageQueue";
import { AppError } from "@utils/AppError";

import { TrainingStorageDTO } from "./TrainingStorageDTO";

export function trainingCreate(newTraining: TrainingStorageDTO) {
    return updateCollection<TrainingStorageDTO>(TRAINING_COLLECTION, trainings => {
        if (trainings.some(training => training.name === newTraining.name)) {
            throw new AppError('Já existe um Treino cadastrado com esse nome.');
        }

        return [...trainings, newTraining];
    });
}
