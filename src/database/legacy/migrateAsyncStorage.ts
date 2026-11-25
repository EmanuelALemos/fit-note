import AsyncStorage from '@react-native-async-storage/async-storage';

import { EXERCISE_COLLECTION, TRAINING_COLLECTION } from '@storage/storageConfig';

import { Database } from '../Database';
import { isDatabaseEmpty } from '../schema';
import { applyImport, isMigrationDone } from './applyImport';
import { parseLegacyData } from './legacyData';
import { planImport } from './planImport';

// Só lê o AsyncStorage: as chaves antigas nunca são alteradas nem apagadas.
export async function migrateAsyncStorage(db: Database) {
    if (isMigrationDone(db) || !isDatabaseEmpty(db)) {
        return;
    }

    const trainings = await AsyncStorage.getItem(TRAINING_COLLECTION);
    const exercises = await AsyncStorage.getItem(EXERCISE_COLLECTION);

    if (trainings === null && exercises === null) {
        return;
    }

    applyImport(db, planImport(parseLegacyData(trainings, exercises)));
}
