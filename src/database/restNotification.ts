import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { RestState } from './rest';

const IDENTIFIER = 'fim-do-descanso';
const CHANNEL = 'descanso';

let ready: Promise<void> | null = null;
let queue = Promise.resolve();

Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

// Canal e permissão (Android 13+) só na primeira vez que um descanso começa.
function prepare(): Promise<void> {
    ready ??= (async () => {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(CHANNEL, {
                name: 'Fim do descanso',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500],
                sound: 'default',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            });
        }

        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
            await Notifications.requestPermissionsAsync();
        }
    })().catch(error => {
        ready = null;
        throw error;
    });

    return ready;
}

// Deixa o aviso igual ao descanso gravado. Em fila, para um pedido antigo não sobrescrever um novo.
export function syncRestNotification(rest: RestState | null) {
    queue = queue.then(async () => {
        await Notifications.cancelScheduledNotificationAsync(IDENTIFIER);

        if (!rest) {
            await Notifications.dismissNotificationAsync(IDENTIFIER);
            return;
        }

        const endsAt = new Date(rest.endsAt);
        if (endsAt.getTime() - Date.now() < 1000) {
            return;
        }

        await prepare();
        await Notifications.scheduleNotificationAsync({
            identifier: IDENTIFIER,
            content: {
                title: 'Fim do descanso',
                body: `Próxima série: ${rest.exerciseName}`,
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: { date: endsAt, channelId: CHANNEL },
        });
    }).catch(error => console.log(error));
}
