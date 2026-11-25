import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { AppError } from '@utils/AppError';

const MAX_BYTES = 20 * 1024 * 1024;

export async function shareBackup(content: unknown) {
    if (!(await Sharing.isAvailableAsync())) {
        throw new AppError('O compartilhamento não está disponível neste aparelho.');
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uri = `${FileSystem.cacheDirectory}fitnote-backup-${stamp}.json`;

    await FileSystem.writeAsStringAsync(uri, JSON.stringify(content, null, 2));
    await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Salvar backup do Fit Note',
    });
}

// Retorna null se a pessoa desistir. Aceita qualquer tipo: nem todo app marca .json como JSON.
export async function pickBackup(): Promise<string | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });

    if (result.canceled) {
        return null;
    }

    const [file] = result.assets;

    if (file.size !== undefined && file.size > MAX_BYTES) {
        throw new AppError('O arquivo é grande demais para ser um backup do Fit Note.');
    }

    return FileSystem.readAsStringAsync(file.uri);
}
