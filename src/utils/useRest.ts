import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useDatabase } from '@database/DatabaseProvider';
import { RestState } from '@database/rest';
import { syncRestNotification } from '@database/restNotification';

// Descanso atual, com os segundos restantes atualizados a cada segundo enquanto corre.
export function useRest() {
    const { repository: { workouts } } = useDatabase();
    const [rest, setRest] = useState<RestState | null>(() => workouts.rest.get());
    const [, setTick] = useState(0);

    const refresh = useCallback(() => setRest(workouts.rest.get()), [workouts]);

    // Depois de qualquer mudança: relê e reagenda (ou cancela) o aviso.
    const changed = useCallback(() => {
        const current = workouts.rest.get();
        setRest(current);
        syncRestNotification(current);
    }, [workouts]);

    useFocusEffect(useCallback(() => {
        refresh();
        const subscription = AppState.addEventListener('change', state => state === 'active' && refresh());
        return () => subscription.remove();
    }, [refresh]));

    useEffect(() => {
        if (!rest) {
            return;
        }

        const interval = setInterval(() => {
            setTick(tick => tick + 1);
            if (workouts.rest.remainingMs(rest) <= 0) {
                setRest(null);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [rest, workouts]);

    const remainingSeconds = rest ? Math.max(0, workouts.rest.remainingMs(rest) / 1000) : 0;

    return { rest, remainingSeconds, refresh, changed };
}
