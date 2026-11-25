import { normalizeName } from '../normalizeName';
import { LegacyData, LegacyExercise } from './legacyData';

export interface PlannedExercise {
    current: LegacyExercise;
    previous: LegacyExercise[]; // outras marcas do mesmo nome, da mais antiga para a mais nova
}

export interface Duplicate {
    kept: LegacyExercise;
    others: LegacyExercise[];
    trainings: string[];
}

export interface ImportPlan {
    exercises: PlannedExercise[];
    trainings: { name: string; exerciseIndexes: number[] }[];
    duplicates: Duplicate[];
    warnings: string[];
}

// Decisão 8: a maior carga fica como atual. Marca sem séries só vence se nenhuma tiver séries.
function bestFirst(a: LegacyExercise, b: LegacyExercise): number {
    const hasSeries = (exercise: LegacyExercise) => Number(exercise.repetitions.length > 0);

    return hasSeries(b) - hasSeries(a) || b.loadKg - a.loadKg;
}

export function planImport(data: LegacyData): ImportPlan {
    const warnings = [...data.warnings];
    const groups = new Map<string, LegacyExercise[]>();

    for (const exercise of data.exercises) {
        const key = normalizeName(exercise.name);
        groups.set(key, [...(groups.get(key) ?? []), exercise]);
    }

    const indexByName = new Map<string, number>(); // nome exato → exercício planejado
    const exercises: PlannedExercise[] = [];
    const duplicates: Duplicate[] = [];

    for (const group of groups.values()) {
        const [current, ...others] = [...group].sort(bestFirst);
        group.forEach(exercise => indexByName.set(exercise.name, exercises.length));
        exercises.push({ current, previous: [...others].reverse() });

        if (others.length > 0) {
            const names = group.map(exercise => exercise.name);
            duplicates.push({
                kept: current,
                others,
                trainings: data.trainings
                    .filter(training => training.exerciseNames.some(name => names.includes(name)))
                    .map(training => training.name),
            });
        }
    }

    const trainings = data.trainings.map(training => {
        const exerciseIndexes: number[] = [];

        for (const name of training.exerciseNames) {
            const index = indexByName.get(name);

            if (index === undefined) {
                warnings.push(`Treino "${training.name}": o exercício "${name}" não existe e foi ignorado.`);
            } else if (!exerciseIndexes.includes(index)) {
                exerciseIndexes.push(index);
            }
        }

        return { name: training.name, exerciseIndexes };
    });

    return { exercises, trainings, duplicates, warnings };
}
