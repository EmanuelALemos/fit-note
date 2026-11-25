import { AppError } from "@utils/AppError";

import { trainingUpdate } from "./trainingUpdate";

export function trainingEdit(trainingName: string, newName: string) {
    return trainingUpdate(trainingName, (training, trainings) => {
        if (newName !== trainingName && trainings.some(item => item.name === newName)) {
            throw new AppError('Já existe um Treino cadastrado com esse nome.');
        }

        return { ...training, name: newName };
    });
}
