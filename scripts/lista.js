// Transforma a lista de texto (docs/PLANO.md, seção 10) em um backup versão 1.
// Uso: npm run lista -- caminho/fitnote-lista-pessoa.txt
const fs = require('fs');
const path = require('path');

// Igual a src/database/normalizeName.ts (conferido em teste).
function normalizeName(name) {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function parseExercise(line) {
    const parts = line.split('|').map(part => part.trim());
    const name = parts[0];

    if (!name || name.startsWith('#')) return null;
    if (parts.length === 1) return { name, data: null };
    if (parts.length !== 3 || !/^\d+([.,]\d+)?$/.test(parts[1])) return null;
    if (parts[2] !== '-' && !/^\d+(\s+\d+)*$/.test(parts[2])) return null;

    return {
        name,
        data: {
            load: Number(parts[1].replace(',', '.')),
            repetitions: parts[2] === '-' ? [] : parts[2].split(/\s+/).map(Number),
        },
    };
}

function parseList(text) {
    const errors = [];
    const trainings = [];
    const exercises = new Map();

    text.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, index) => {
        const line = raw.trim();
        const at = `Linha ${index + 1}`;
        if (!line) return;

        if (/^#\s/.test(line)) {
            const name = line.slice(1).trim();
            if (trainings.some(training => training.name === name)) errors.push(`${at}: treino repetido "${name}".`);
            trainings.push({ name, exercises: [] });
            return;
        }

        const exercise = parseExercise(line);
        const training = trainings[trainings.length - 1];

        if (!exercise) return void errors.push(`${at}: não entendi "${line}".`);
        if (!training) return void errors.push(`${at}: exercício antes do primeiro treino.`);
        if (training.exercises.includes(exercise.name)) errors.push(`${at}: "${exercise.name}" repetido em "${training.name}".`);

        training.exercises.push(exercise.name);

        const known = exercises.get(exercise.name);
        if (known && exercise.data && JSON.stringify(known) !== JSON.stringify(exercise.data)) {
            errors.push(`${at}: "${exercise.name}" aparece com valores diferentes.`);
        }
        exercises.set(exercise.name, known || exercise.data);
    });

    if (trainings.length === 0) errors.push('Nenhum treino encontrado.');

    for (const [name, data] of exercises) {
        if (!data) errors.push(`"${name}" não tem carga nem séries em nenhum treino.`);
    }

    const groups = new Map();
    for (const name of exercises.keys()) {
        const key = normalizeName(name);
        groups.set(key, [...(groups.get(key) || []), name]);
    }

    return { trainings, exercises, errors, duplicates: [...groups.values()].filter(names => names.length > 1) };
}

function buildBackup({ trainings, exercises }, now = new Date()) {
    return {
        app: 'fit-note',
        version: 1,
        source: 'transcricao',
        exportedAt: now.toISOString(),
        asyncStorage: {
            '@fit-note: trainings': JSON.stringify(
                trainings.map(training => ({ name: training.name, exercicies: training.exercises }))
            ),
            '@fit-note: exercises': JSON.stringify([...exercises].map(([name, data]) => ({
                name,
                load: data.load,
                series: data.repetitions.map((repetitions, index) => ({
                    repetitions, exerciseId: name, name: `${index + 1}° série`,
                })),
            }))),
        },
    };
}

function describe(name, { load, repetitions }) {
    return `${name}: ${String(load).replace('.', ',')} kg · ${repetitions.join('/') || 'sem séries'}`;
}

function report({ trainings, exercises, duplicates }) {
    const lines = [];

    for (const training of trainings) {
        lines.push(training.name.toUpperCase());
        training.exercises.forEach(name => lines.push(`  ${describe(name, exercises.get(name))}`));
        lines.push('');
    }

    for (const names of duplicates) {
        lines.push('DUPLICATA (mesmo nome sem acentos, maiúsculas e espaços):');
        for (const name of names) {
            const where = trainings.filter(training => training.exercises.includes(name)).map(training => training.name);
            lines.push(`  ${describe(name, exercises.get(name))} (${where.join(', ')})`);
        }
        lines.push('');
    }

    const sets = [...exercises.values()].reduce((total, data) => total + data.repetitions.length, 0);
    const links = trainings.reduce((total, training) => total + training.exercises.length, 0);
    lines.push(`Total: ${trainings.length} treinos, ${exercises.size} exercícios, ${sets} séries, ${links} vínculos, ${duplicates.length} duplicatas.`);

    return lines.join('\n');
}

function main(file) {
    if (!file) {
        console.error('Uso: npm run lista -- caminho/fitnote-lista-pessoa.txt');
        return 1;
    }

    const list = parseList(fs.readFileSync(file, 'utf8'));

    if (list.errors.length > 0) {
        console.error(`Nenhum arquivo gerado:\n${list.errors.map(error => `- ${error}`).join('\n')}`);
        return 1;
    }

    const now = new Date();
    const output = path.join(path.dirname(path.resolve(file)), `fitnote-backup-${now.toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(output, JSON.stringify(buildBackup(list, now), null, 2), { flag: 'wx' });
    console.log(`${report(list)}\n\nGerado: ${output}`);
    return 0;
}

if (require.main === module) {
    process.exitCode = main(process.argv[2]);
}

module.exports = { buildBackup, normalizeName, parseList, report };
