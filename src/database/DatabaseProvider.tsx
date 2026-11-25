import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Center, Text } from 'native-base';

import { Loading } from '@components/Loading';
import { backupExport } from '@storage/backup/backupExport';
import { AppError } from '@utils/AppError';

import { Database } from './Database';
import { openExpoDatabase } from './expoDatabase';
import { migrateAsyncStorage } from './legacy/migrateAsyncStorage';
import { createRepository, Repository } from './repository';
import { prepareSchema } from './schema';

interface DatabaseContextValue {
    db: Database;
    repository: Repository;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useDatabase(): DatabaseContextValue {
    const value = useContext(DatabaseContext);

    if (!value) {
        throw new Error('useDatabase fora do DatabaseProvider.');
    }

    return value;
}

async function open(): Promise<DatabaseContextValue> {
    const db = openExpoDatabase();
    prepareSchema(db);
    await migrateAsyncStorage(db);

    return { db, repository: createRepository(db) };
}

async function exportRawData() {
    try {
        await backupExport();
    } catch (error) {
        Alert.alert('Backup', error instanceof AppError ? error.message : 'Não foi possível exportar os dados.');
    }
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const [value, setValue] = useState<DatabaseContextValue | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        open().then(setValue).catch(reason => {
            console.log(reason);
            setError(reason instanceof AppError ? reason.message : 'Não foi possível abrir os dados.');
        });
    }, []);

    if (error) {
        return (
            <Center flex={1} bg='#404040' px={6}>
                <Text color='white' fontSize={20} textAlign='center' fontFamily={'Poppins_600SemiBold'}>{error}</Text>
                <Button mt={8} bg='#525252' borderRadius={14} onPress={exportRawData}>
                    <Text color='#D9F99D' fontFamily={'Poppins_600SemiBold'}>Exportar dados antigos</Text>
                </Button>
            </Center>
        );
    }

    if (!value) {
        return <Center flex={1} bg='#404040'><Loading /></Center>;
    }

    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}
