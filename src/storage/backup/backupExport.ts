import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { AppError } from "@utils/AppError";
import { backupBuild } from "./backupBuild";

// Somente leitura: nunca grava no AsyncStorage.
export async function backupExport() {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter(key => key.startsWith('@fit-note'));

    if (keys.length === 0) {
        throw new AppError('Ainda não há dados para exportar.');
    }

    if (!(await Sharing.isAvailableAsync())) {
        throw new AppError('O compartilhamento não está disponível neste aparelho.');
    }

    const entries = await AsyncStorage.multiGet(keys);
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const uri = `${FileSystem.cacheDirectory}fitnote-backup-${stamp}.json`;

    await FileSystem.writeAsStringAsync(uri, JSON.stringify(backupBuild(entries, now), null, 2));
    await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Salvar backup do Fit Note',
    });
}
