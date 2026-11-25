# Plano de evolução do Fit Note

Fonte de verdade para as próximas sessões. Atualize este arquivo no mesmo PR sempre que uma etapa terminar ou uma decisão for tomada.

Marcação usada: **[proposta]** = sugestão que surgiu na leitura do código e ainda não foi aprovada. O que não tem marca já foi decidido.

## Andamento

| Etapa | Conteúdo | Estado |
|---|---|---|
| 1 | Correções sem mudar o modelo | Implementada; aguardando teste no celular |
| 2 | SQLite, repositório e migração | Não iniciada |
| 3 | Renomear e reordenar | Não iniciada |
| 4 | Sessões | Não iniciada |
| 5 | Timer de descanso | Não iniciada |
| 6 | Histórico com gráficos | Não iniciada |

## 1. Objetivo do app

Substituir o caderno da academia e facilitar a **sobrecarga progressiva**: chegar no exercício, ver rápido o que fiz da última vez e tentar superar.

- **Diferencial:** o exercício é uma entidade única, compartilhada entre treinos. Progresso no Supino do "Upper A" aparece no "Upper B".
- Entrada rápida durante o descanso: poucos toques, +/− em vez de digitar.
- 100% offline, sem servidor.
- Visual minimalista.

**Filtro para qualquer decisão:** "isso adiciona toques durante o treino?" Se adiciona, é opcional ou fica fora da tela principal.

## 2. Regras de trabalho

- Uma branch e um commit/PR por etapa. **Parar no fim de cada etapa** para o Emanuel testar no celular.
- **Nunca apagar as chaves antigas do AsyncStorage.** Qualquer ação destrutiva ou irreversível: perguntar antes.
- Ao fim de cada etapa: `npx tsc --noEmit` e testes.
- Pacotes nativos sempre com `npx expo install`.
- Manter os aliases de import (`@storage`, `@components`, `@screens`…). A camada nova pede um alias `@database` no `tsconfig.json`.
- Manter o visual: fundo `#404040` com `padrões.png`, cards `#525252` com raio 14, destaque `#D9F99D`, Poppins SemiBold, títulos em caixa alta, interface em português.
- Não atualizar o Expo SDK nem trocar o native-base agora.
- Branches partem de `origin/main` atualizada.

## 3. Estado atual do código

- Expo SDK 51, React Native 0.74.5, native-base 3.4, React Navigation 6 (native-stack).
- Três telas: `Training` → `Exercise` → `Series`. Nomes servem de ID e de parâmetro de rota.
- Dados em duas chaves JSON do AsyncStorage:
  - `@fit-note: trainings` → `{ name, exercicies: string[] }[]` (a grafia `exercicies` está gravada nos dados; a migração precisa lê-la assim)
  - `@fit-note: exercises` → `{ name, load, series: { name, repetitions, exerciseId }[] }[]`
  - `@fit-note: series` está declarada, mas nunca é usada.
- Gesture handler, Reanimated e SVG já instalados. `expo-sqlite`, `expo-notifications` e testes ainda não.
- `npx tsc --noEmit` passa hoje, mas `skipLibCheck` ignora os `.d.ts`, e por isso o bug 6 não aparece.

## 4. Bugs e dívida técnica

### Lista original

| # | Problema | Onde | Etapa |
|---|---|---|---|
| 1 | Apagar o último treino apaga todos os exercícios e cargas | `trainingRemoveByName` | 1 |
| 2 | Toques rápidos em +/− perdem escrita (read-modify-write concorrente) | `src/storage/*` | 1 (fila); 2 (solução final) |
| 3 | Nome do exercício é o ID: duplicatas por espaço/caixa e sem renomear | modelo | 2 (ID); 3 (renomear) |
| 4 | `parseInt` na carga: 12,5 vira 12 | `Series.handleSave` | 1 |
| 5 | Sem histórico; carga e repetições são sobrescritas | modelo | 2 e 4 |
| 6 | Tipagem de rotas quebrada (`RootParamiList`, `exercice`, pacote não instalado) | `src/@types/navigation.d.ts` | 1 |
| 7 | Estado vazio pisca antes do loading | `Training`, `Exercise` | 1 |
| 8 | `return new AppError` em vez de `throw` | `exerciseCreate` | 1 |
| 9 | "1° série" deve ser "1ª série" | `Series` | 1 |
| 10 | Botão "−" sempre parece desabilitado | `SerieBodyCard`, `SerieHeaderCard` | 1 |
| 11 | Layout com valores fixos; último item cortado | três telas, `Header` | 1 |
| 12 | README cita "Estado Global" inexistente | `README.md` | fim |

### Encontrados na leitura do código

Itens 13 a 17 aprovados e incluídos na Etapa 1.

| # | Problema | Etapa sugerida |
|---|---|---|
| 13 | **O nome da série é a chave dos dados.** Trocar `°` por `ª` ao gravar faria o "−" deixar de achar as séries antigas. Correção do bug 9: gravação intacta, rótulo `Nª série` calculado pela posição na tela, e remoção/edição pelo índice | 1, junto do 9 |
| 14 | `InputPopup` fecha antes do salvamento terminar, inclusive com erro de validação, e o texto digitado se perde | 1 |
| 15 | `exerciseEditLoad` troca a lista por vazia quando o JSON está corrompido e grava por cima, apagando tudo. Deve falhar sem gravar | 1 |
| 16 | `+/−` podem ler o valor anterior no `disabled`, permitindo repetição negativa em toques rápidos | 1, junto do 2 |
| 17 | `AppError` não estende `Error` (sem stack) | 1 |
| 18 | Exercício removido de todos os treinos fica guardado sem tela que o mostre. Preservar; decidir depois se há uma tela para ele | depois |
| 19 | Imports não usados e dependências sem uso (`masked-view`, `@phosphor-icons/core`, `size-matters`, `responsive-fontsize` e outras) | fim |

## 5. Riscos

1. **O Expo Go não enxerga os dados reais.** Segundo o README, o uso diário é no APK, que tem armazenamento separado. No Expo Go, a migração só pode ser testada com dados de exemplo.
2. **O APK novo precisa instalar por cima do antigo** (mesmo pacote `com.emanuel_alemos.FitNote` e mesma chave de assinatura). Nunca desinstalar o antigo: isso apaga os dados. Conferir a assinatura (seção 9) antes de instalar **qualquer** APK novo, inclusive o do backup.
3. **Não existe backup.** Aprovado: a Etapa 1 traz um botão mínimo e somente leitura que compartilha o JSON bruto das duas chaves. Instalar esse APK, exportar e guardar o arquivo antes da Etapa 2. O mesmo arquivo serve para testar a migração com dados reais (sem ir para o Git).
4. **Os dados são o estado atual, não 1 ano de histórico.** Como as cargas são sobrescritas (bug 5), a migração recupera só a última marca de cada exercício. Os gráficos começam a se formar na Etapa 4.
5. **Expo Go e SDK 51:** a versão da loja costuma suportar só SDKs recentes. O celular precisa do Expo Go compatível com o SDK 51 ou de um build próprio. Notificações da Etapa 5 devem ser validadas em build próprio, com permissão de notificação (Android 13+) e de alarme exato (Android 12+).
6. **Voltar ao APK antigo após a migração** mostra os dados congelados no dia dela, pois o AsyncStorage deixa de receber escritas.

## 6. Nova camada de dados (SQLite local)

Acesso centralizado em `src/database/`. Telas não usam SQL nem AsyncStorage. Escritas em transação.

### Tabelas

- **exercise**: id, name, name_normalized UNIQUE, rest_seconds DEFAULT 90, target_reps_min, target_reps_max, default_sets, notes, created_at
- **training**: id, name, position, created_at
- **training_exercise**: training_id, exercise_id, position (ordem por treino)
- **session**: id, training_id, started_at, finished_at NULL
- **set_log**: id, session_id, exercise_id, set_number, load_kg REAL, reps, completed_at

### Ajustes aprovados

| Ajuste | Motivo |
|---|---|
| `exercise.current_load_kg REAL` | Há carga mesmo sem séries; `set_log` sozinho a perderia. É a carga única exibida na interface |
| `session.kind` (`'workout'` ou `'imported'`) | Importadas valem para a "última vez", mas não são treinos: ficam fora de "último: dia", resumo e gráficos |
| `session.training_id` NULL, com `ON DELETE SET NULL` e `training_name` copiado | Importadas não pertencem a um treino; excluir um treino não pode apagar histórico |
| `set_log.completed_at` NULL | Série planejada ou ainda não marcada com ✓ |
| `PRIMARY KEY (training_id, exercise_id)` | Evita exercício duplicado no treino |
| Índice único parcial: no máximo uma sessão `workout` aberta | Garante a regra da sessão única |
| `PRAGMA user_version`, `foreign_keys = ON`, WAL | Versões do esquema e integridade |

**Nome normalizado:** usado só para detectar duplicatas: sem espaços nas pontas, espaços internos unidos, minúsculas e sem acentos. O nome exibido fica exatamente como foi digitado.

**Entre as Etapas 2 e 4:** as telas atuais leem e editam a sessão `imported` do exercício (criada sob demanda para exercícios novos), mantendo o comportamento. A partir da Etapa 4 ela vira somente leitura.

### Migração (crítica)

1. Roda na abertura, antes das telas, se a flag de conclusão não existir, o SQLite estiver vazio e houver chaves antigas.
2. Lê e valida os JSONs. JSON inválido: aborta, não grava nada, não marca a flag e mostra erro claro.
3. Em **uma transação**: gera IDs, cria exercícios (dedupe por nome normalizado), treinos e vínculos na ordem atual, uma sessão importada por exercício com as séries e a carga atuais, e a flag.
4. Compara contagens e só então confirma.
5. Não altera nem apaga o AsyncStorage.

Casos a testar:

- execução normal e segunda execução (idempotência)
- interrupção no meio (rollback e nova tentativa)
- instalação nova, só uma das chaves, JSON corrompido
- itens `null` na lista
- dedupe ("Supino" / "supino ") e vínculos apontando para o mesmo exercício
- treino citando exercício inexistente; exercício sem treino
- exercício sem séries mas com carga; série com 0 repetições; carga nula ou inválida
- nomes com `°` e com `ª`; ordem preservada
- AsyncStorage idêntico antes e depois

**Testes [proposta]:** `jest-expo`, com o repositório sobre uma interface pequena para rodar o mesmo SQL em um SQLite de Node.

## 7. Etapas

### Etapa 1: correções sem mudar o modelo

Bugs 1, 4, 6, 7, 8, 9, 10, 11 e fila/mutex para o 2. Também: 13 a 17 e a exportação de segurança (risco 3).

Aceite:
- excluir o último treino preserva exercícios e cargas
- 20 toques rápidos em + somam 20
- 12,5 e 12.5 gravam 12,5; teclado numérico; texto inválido é recusado
- séries antigas continuam removíveis e aparecem como "1ª série"
- estado vazio não pisca; último item visível acima da barra de navegação
- "−" ativo e inativo visualmente distintos

Verificado sem celular: `tsc`, testes automáticos e geração do bundle Android. Layout, teclado e compartilhamento dependem do teste no aparelho.

### Etapa 2: SQLite, repositório, migração e telas atuais adaptadas

Mesmo comportamento visível. Aceite: testes da migração verdes, migração validada com o backup real e nenhuma tela usando o storage antigo.

### Etapa 3: renomear e reordenar

- Menu ⋯ no card de exercício, com Renomear (modal igual ao `InputPopup`) avisando "está em N treinos; o nome muda em todos". Nome já existente é recusado.
- Drag & drop com alça ⋮⋮ para exercícios (por treino) e treinos. Requer `GestureHandlerRootView` em `App.tsx`.
- Card de treino: editar/excluir no menu ⋯; mostra "N exercícios · último: dia/data". Sem sessão real (antes da Etapa 4), mostra só "N exercícios".

### Etapa 4: sessões

- Botão fixo "INICIAR TREINO" na tela de exercícios.
- Tela de séries: colunas SÉRIE | ÚLTIMA | HOJE; indicador ↑ +1 / = igual / ↓; ✓ conclui a série.
- Carga com decimal e "última: X kg"; faixa alvo de repetições; sugestão de subir a carga ao bater o topo da faixa em todas as séries.
- "Última vez" = sessão anterior mais recente com aquele exercício, em **qualquer** treino. A importada só vale enquanto não houver outra.
- Card na lista: "Última: 22 kg · 10/8/7".
- Resumo ao finalizar: duração, séries, volume, repetições, recordes do dia e comparação com a sessão anterior do mesmo treino.
- Sessão aberta sobrevive ao app fechado.

### Etapa 5: timer de descanso

- Barra acima do card de carga: "Descanso · 1:30 · Iniciar"; começa ao tocar ✓ (ver decisão 1).
- Rodando: contagem grande, "termina às HH:MM", barra de progresso, −15s / +15s / Pular.
- Guardar o **horário de término**, não a contagem em memória. Notificação local e vibração com `expo-notifications`, com a tela bloqueada.
- Ajustar ou pular reagenda/cancela a notificação. Padrão por exercício (`rest_seconds`).

### Etapa 6: histórico com gráficos

- Abre ao tocar no nome do exercício na tela de séries.
- Seletor Carga / Repetições / Volume; períodos 1M / 3M / 6M / 1A.
- Valor atual e variação no período; linha em `react-native-svg` com o recorde destacado.
- Lista de sessões: data, treino de origem, carga, repetições.

### Fim do ciclo

README (bug 12, tecnologias, roadmap) e limpeza de dependências (19).

### Depois, fora do escopo

Exportar/importar backup completo em JSON, notas por exercício, substituir exercício só na sessão do dia, atualização do Expo SDK, troca do native-base.

## 8. Decisões em aberto

Perguntar antes de implementar a parte afetada.

| # | Pergunta | Afeta | Decisão |
|---|---|---|---|
| 1 | O ✓ inicia o timer automaticamente ou só pelo botão? (A descrição da Etapa 5 diz que começa no ✓) | 5 | |
| 2 | ±15s vira o novo padrão do exercício ou vale só para aquele descanso? | 5 | |
| 3 | Tela de séries sem sessão: só leitura com convite, ou a primeira série inicia a sessão? | 4 | |
| 4 | Carga única por exercício, com edição opcional por série? | 4 | |
| 5 | Incluir na Etapa 1 a exportação de segurança? | 1 | **Sim**, no primeiro commit |
| 6 | Incluir na Etapa 1 os itens 13 a 17? (O 13 é necessário para o 9) | 1 | **Sim** |
| 7 | Normalização ignora acentos ("maquina" = "máquina")? | 2 | **Sim**, só para detectar duplicatas; o nome exibido não muda |
| 8 | Duplicatas com marcas diferentes: qual vale? Os dados antigos não têm data | 2 | O teste com o backup real **lista as duplicatas e o Emanuel decide caso a caso**. Se forem muitas, vale a regra: maior carga fica como atual e a outra vira sessão importada anterior |
| 9 | Aprovar os ajustes sugeridos no esquema (seção 6)? | 2 | **Sim** |

## 9. Antes da Etapa 2

### Conferir a assinatura do APK

1. Chave guardada no EAS: `npx eas-cli credentials -p android`, perfil `preview`. Anotar o **SHA-256** do keystore. Só consultar: nunca escolher opções de criar, trocar ou apagar keystore.
2. Assinatura do APK em uso: pegar o arquivo do APK (página do build no EAS ou `adb shell pm path com.emanuel_alemos.FitNote` e `adb pull <caminho>`) e rodar `apksigner verify --print-certs <arquivo>.apk` (Android SDK build-tools).
3. Os dois SHA-256 precisam ser iguais. Se forem diferentes, parar: o APK novo não instala por cima. **Não desinstalar o antigo.**
4. Comparar o versionCode remoto (`npx eas-cli build:version:get -p android`) com o instalado (`adb shell dumpsys package com.emanuel_alemos.FitNote | grep versionCode`). O do APK novo não pode ser menor que o instalado, senão o Android recusa a atualização.

### Testar a migração com o JSON exportado, sem tocar no APK

Formato: `{ app, version, exportedAt, asyncStorage: { "<chave>": "<texto bruto>" } }`. Nome `fitnote-backup-*.json`, ignorado pelo Git. Entregar na Etapa 2:

1. **No computador:** teste que recebe o caminho do arquivo por `FITNOTE_BACKUP`, executa a migração num SQLite de Node, confere contagens, cargas, repetições e ordem, e imprime um relatório com **todas as duplicatas encontradas** (nomes originais, carga, séries e treinos de cada uma). Sem a variável, o teste é pulado.
2. **No Expo Go (ou build de desenvolvimento com outro pacote):** ação "importar backup de teste", só em `__DEV__`, que carrega o JSON no AsyncStorage daquele app antes da migração. Recusa se já houver dados.

Mockups: https://claude.ai/artifact/C4TgGYGhYBc8rowCmznTez (as descrições deste plano bastam; se algo ficar ambíguo, perguntar).
