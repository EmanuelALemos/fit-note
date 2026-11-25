import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Atualiza ao focar a tela, ao voltar para o app e a cada 30 s (tempo do treino e encerramento automático).
export function useRefresh(refresh: () => void) {
    const latest = useRef(refresh);
    latest.current = refresh;

    useFocusEffect(useCallback(() => {
        const run = () => latest.current();
        run();

        const interval = setInterval(() => AppState.currentState === 'active' && run(), 30000);
        const subscription = AppState.addEventListener('change', state => state === 'active' && run());

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, []));
}
