import { TRAINING_COLLECTION } from "@storage/storageConfig";
import { updateCollection } from "@storage/storageQueue";
import { AppError } from "@utils/AppError";

import { TrainingStorageDTO } from "./TrainingStorageDTO";

export function trainingUpdate(
    trainingName: string,
    update: (training: TrainingStorageDTO, trainings: TrainingStorageDTO[]) => TrainingStorageDTO
) {
    return updateCollection<TrainingStorageDTO>(TRAINING_COLLECTION, trainings => {
        if (!trainings.some(training => training.name === trainingName)) {
            throw new AppError('O treino especificado não foi encontrado.');
        }

        return trainings.map(training => training.name === trainingName ? update(training, trainings) : training);
    });
}
