import AsyncStorage from "@react-native-async-storage/async-storage";

let queue: Promise<unknown> = Promise.resolve();

// Executa uma operação por vez, na ordem de chegada. Não é reentrante:
// uma tarefa da fila não pode aguardar outra tarefa da fila.
function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = queue.then(task);
    queue = result.catch(() => undefined); // uma falha não trava as próximas
    return result;
}

async function readList<T>(key: string): Promise<T[]> {
    const storage = await AsyncStorage.getItem(key);
    const list: unknown = storage ? JSON.parse(storage) : [];

    if (!Array.isArray(list)) {
        throw new Error(`Os dados de "${key}" não são uma lista.`);
    }

    return list.filter(item => item !== null && item !== undefined);
}

export function readCollection<T>(key: string): Promise<T[]> {
    return enqueue(() => readList<T>(key));
}

// Se a leitura ou o update falhar, nada é gravado.
export function updateCollection<T>(key: string, update: (list: T[]) => T[]): Promise<void> {
    return enqueue(async () => {
        const updated = update(await readList<T>(key));
        await AsyncStorage.setItem(key, JSON.stringify(updated));
    });
}
