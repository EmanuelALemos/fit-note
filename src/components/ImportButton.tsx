import { useState } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { Text } from 'native-base';

import { PreparedImport, prepareImport } from '@database/backup';
import { pickBackup } from '@database/backupFiles';
import { useDatabase } from '@database/DatabaseProvider';
import { AppError } from '@utils/AppError';

interface ImportButtonProps {
    onImported: () => void;
}

function summarize({ trainings, exercises, sets, duplicates, warnings }: PreparedImport): string {
    const lines = [`${trainings} treinos, ${exercises} exercícios, ${sets} séries.`];

    if (duplicates.length > 0) {
        lines.push(`Duplicatas unidas: ${duplicates.map(duplicate => duplicate.kept.name).join(', ')}.`);
    }

    if (warnings.length > 0) {
        lines.push(`Avisos (${warnings.length}): ${warnings.slice(0, 3).join(' ')}`);
    }

    return lines.join('\n\n');
}

export function ImportButton({ onImported }: ImportButtonProps) {
    const { db } = useDatabase();
    const [isPicking, setIsPicking] = useState(false);

    function showError(error: unknown) {
        console.log(error);
        Alert.alert(
            'Importar backup',
            error instanceof AppError ? error.message : 'Não foi possível importar. Nada foi alterado.'
        );
    }

    function handleConfirm(prepared: PreparedImport) {
        try {
            prepared.apply(db);
            onImported();
            Alert.alert('Importar backup', 'Dados importados.');
        } catch (error) {
            showError(error);
        }
    }

    async function handlePress() {
        try {
            setIsPicking(true);
            const text = await pickBackup();

            if (text === null) {
                return;
            }

            const prepared = prepareImport(text);

            Alert.alert('Importar backup', summarize(prepared), [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Importar', onPress: () => handleConfirm(prepared) },
            ]);
        } catch (error) {
            showError(error);
        } finally {
            setIsPicking(false);
        }
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            disabled={isPicking}
            accessibilityRole='button'
            hitSlop={12}
            style={{ alignSelf: 'center', marginTop: 32, opacity: isPicking ? 0.4 : 0.8 }}
        >
            <Text color='white' fontSize={16} fontFamily={'Poppins_600SemiBold'} allowFontScaling={false} underline>
                Importar backup
            </Text>
        </TouchableOpacity>
    );
}
