import fs from 'fs';

import { prepareImport } from '@database/backup';
import { createRepository } from '@database/repository';

import { createMemoryDatabase } from '../testUtils/memoryDatabase';

// FITNOTE_BACKUP=caminho/do/fitnote-backup.json npx jest realBackup
const file = process.env.FITNOTE_BACKUP;

(file ? test : test.skip)('migração com o backup real', () => {
    const backup = JSON.parse(fs.readFileSync(file!, 'utf8').replace(/^﻿/, ''));
    expect(backup.version).toBe(1);

    const prepared = prepareImport(JSON.stringify(backup));
    const db = createMemoryDatabase();
    prepared.apply(db);
    const repository = createRepository(db);

    const lines: string[] = [];
    const migrated = repository.listTrainings().map(training => {
        lines.push(training.name.toUpperCase());
        return {
            name: training.name,
            exercises: repository.listExercises(training.id).map(item => {
                const { name, loadKg, repetitions } = repository.getExercise(item.id);
                lines.push(`  ${name}: ${loadKg} kg · ${repetitions.join('/') || 'sem séries'}`);
                return { name, loadKg, repetitions };
            }),
        };
    });

    for (const { kept, others, trainings } of prepared.duplicates) {
        lines.push(`DUPLICATA em ${trainings.join(', ') || 'nenhum treino'}`);
        [kept, ...others].forEach((mark, index) => lines.push(
            `  ${index === 0 ? 'fica' : 'anterior'}: "${mark.name}" ${mark.loadKg} kg · ${mark.repetitions.join('/')}`
        ));
    }

    lines.push(...prepared.warnings.map(warning => `AVISO ${warning}`));
    lines.push(`Total: ${prepared.trainings} treinos, ${prepared.exercises} exercícios, ${prepared.sets} séries, ${migrated.reduce((total, training) => total + training.exercises.length, 0)} vínculos, ${prepared.duplicates.length} duplicatas.`);
    process.stdout.write(`\n${lines.join('\n')}\n`);

    // Confere com o arquivo de origem, sem passar pelo código da migração.
    if (prepared.duplicates.length === 0 && prepared.warnings.length === 0) {
        const sources = JSON.parse(backup.asyncStorage['@fit-note: exercises']);
        const expected = JSON.parse(backup.asyncStorage['@fit-note: trainings']).map((training: any) => ({
            name: training.name,
            exercises: training.exercicies.map((name: string) => {
                const source = sources.find((item: any) => item?.name === name);
                return { name, loadKg: source.load, repetitions: source.series.map((serie: any) => serie.repetitions) };
            }),
        }));
        expect(migrated).toEqual(expected);
    }
});
