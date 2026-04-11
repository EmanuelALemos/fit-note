import { SeriesStorageDTO } from "@storage/series/SeriesStorageDTO";

export interface ExerciseStorageDTO {
    name: string;
    series: SeriesStorageDTO[];
    load: number;
}