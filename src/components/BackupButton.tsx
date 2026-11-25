import { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { buildBackup } from '@database/backup';
import { shareBackup } from '@database/backupFiles';
import { useDatabase } from '@database/DatabaseProvider';
import { AppError } from '@utils/AppError';

export function BackupButton() {
    const insets = useSafeAreaInsets();
    const { db, repository } = useDatabase();
    const [isExporting, setIsExporting] = useState(false);

    async function handleExport() {
        try {
            setIsExporting(true);

            if (repository.isEmpty()) {
                throw new AppError('Ainda não há dados para exportar.');
            }

            await shareBackup(buildBackup(db));
        } catch (error) {
            console.log(error);
            Alert.alert(
                'Backup',
                error instanceof AppError ? error.message : 'Não foi possível exportar os dados.'
            );
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <TouchableOpacity
            onPress={handleExport}
            disabled={isExporting}
            accessibilityRole='button'
            accessibilityLabel='Exportar backup'
            hitSlop={12}
            style={{
                position: 'absolute',
                top: insets.top + 16,
                right: 24,
                opacity: isExporting ? 0.4 : 0.8,
            }}
        >
            <MaterialIcons name='ios-share' size={26} color='white' />
        </TouchableOpacity>
    );
}
