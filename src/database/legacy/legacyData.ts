import { AppError } from '@utils/AppError';

export interface LegacyExercise {
    name: string;
    loadKg: number;
    repetitions: number[];
}

export interface LegacyTraining {
    name: string;
    exerciseNames: string[];
}

export interface LegacyData {
    trainings: LegacyTraining[];
    exercises: LegacyExercise[];
    warnings: string[];
}

function parseList(raw: string | null, label: string): unknown[] {
    let list: unknown;

    try {
        list = raw ? JSON.parse(raw) : [];
    } catch {
        throw new AppError(`Os dados de ${label} estão corrompidos. Nada foi alterado.`);
    }

    if (!Array.isArray(list)) {
        throw new AppError(`Os dados de ${label} não são uma lista. Nada foi alterado.`);
    }

    return list.filter(item => item !== null && item !== undefined);
}

function readName(item: unknown, label: string): string {
    const name = (item as { name?: unknown }).name;

    if (typeof name !== 'string' || name.trim() === '') {
        throw new AppError(`Há um item sem nome em ${label}. Nada foi alterado.`);
    }

    return name;
}

// Lê o conteúdo bruto das chaves antigas do AsyncStorage.
export function parseLegacyData(rawTrainings: string | null, rawExercises: string | null): LegacyData {
    const warnings: string[] = [];

    const exercises = parseList(rawExercises, 'exercícios').map(item => {
        const name = readName(item, 'exercícios');
        const { load, series } = item as { load?: unknown; series?: unknown };

        const validLoad = typeof load === 'number' && Number.isFinite(load) && load >= 0;
        if (!validLoad) {
            warnings.push(`"${name}": carga inválida (${JSON.stringify(load)}), gravada como 0.`);
        }

        if (series !== undefined && series !== null && !Array.isArray(series)) {
            throw new AppError(`As séries de "${name}" não são uma lista. Nada foi alterado.`);
        }

        const repetitions = ((series ?? []) as unknown[])
            .filter(serie => serie !== null && serie !== undefined)
            .map((serie, index) => {
                const value = (serie as { repetitions?: unknown }).repetitions;
                if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
                    return value;
                }
                warnings.push(`"${name}", ${index + 1}ª série: repetições inválidas (${JSON.stringify(value)}), gravadas como 0.`);
                return 0;
            });

        return { name, loadKg: validLoad ? load as number : 0, repetitions };
    });

    const trainings = parseList(rawTrainings, 'treinos').map(item => {
        const name = readName(item, 'treinos');
        // "exercicies" é a grafia gravada nos dados antigos.
        const names = (item as { exercicies?: unknown }).exercicies ?? [];

        if (!Array.isArray(names)) {
            throw new AppError(`Os exercícios do treino "${name}" não são uma lista. Nada foi alterado.`);
        }

        return { name, exerciseNames: names.filter((value): value is string => typeof value === 'string') };
    });

    return { trainings, exercises, warnings };
}
