import AsyncStorage from "@react-native-async-storage/async-storage";

import { shareBackup } from "@database/backupFiles";
import { AppError } from "@utils/AppError";

import { backupBuild } from "./backupBuild";

// Exporta as chaves antigas em texto bruto. Somente leitura: nunca grava no AsyncStorage.
export async function backupExport() {
    const allKeys = await AsyncStorage.getAllKeys();
    const keys = allKeys.filter(key => key.startsWith('@fit-note'));

    if (keys.length === 0) {
        throw new AppError('Não há dados antigos para exportar.');
    }

    await shareBackup(backupBuild(await AsyncStorage.multiGet(keys), new Date()));
}
