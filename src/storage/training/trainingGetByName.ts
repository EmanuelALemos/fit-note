import { trainingsGetAll } from "./trainingsGetAll";

export async function trainingGetByName(trainingName: string) {
    try {
        const trainings = await trainingsGetAll();

        const training = trainings.find((training) => training?.name === trainingName);

        return training;
    } catch (error) {
        throw error;
    }
}