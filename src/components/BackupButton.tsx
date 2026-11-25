import { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { backupExport } from '@storage/backup/backupExport';
import { AppError } from '@utils/AppError';

export function BackupButton() {
    const insets = useSafeAreaInsets();
    const [isExporting, setIsExporting] = useState(false);

    async function handleExport() {
        try {
            setIsExporting(true);
            await backupExport();
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
