# Plano de evolução do Fit Note

Fonte de verdade para as próximas sessões. Atualize este arquivo no mesmo PR sempre que uma etapa terminar ou uma decisão for tomada.

Marcação usada: **[proposta]** = sugestão que surgiu na leitura do código e ainda não foi aprovada. O que não tem marca já foi decidido.

## Andamento

| Etapa | Conteúdo | Estado |
|---|---|---|
| 1 | Correções sem mudar o modelo | Concluída e testada no Expo Go |
| 2 | SQLite, repositório, migração, importação e exportação | Concluída e testada no Expo Go |
| 2b | App novo: identidade, conta, keystore e primeiro build (seção 9) | Configuração pronta; aguardando conta, keystore e builds do Emanuel |
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
- **Nunca desinstalar nem limpar os dados do app antigo**, em nenhum dos celulares, até os dados estarem conferidos no app novo.
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

1. **O Expo Go não enxerga os dados reais.** O uso diário é no APK, que tem armazenamento separado.
2. **O APK antigo não pode ser atualizado.** O acesso à conta Expo `emanuel_alemos` foi perdido e, com ela, a chave de assinatura. Verificado neste computador: não há sessão do EAS, e uma busca na pasta do usuário (sem AppData, até 5 níveis) não achou o keystore. **A conta antiga está descartada: decidido não tentar recuperá-la.** A versão nova será um app separado, instalado ao lado do antigo.
3. **Os dados reais só saem do app antigo pela leitura da tela** (adb, seção 10). `adb backup` não serve: Android 13 e targetSdk 34. Não haverá APK de backup do `f2900e8`. Cargas decimais já tinham sido truncadas pelo app antigo. Exercícios fora de todos os treinos não aparecem em tela nenhuma, mas voltam com carga e séries ao adicionar o nome exato a um treino no app antigo.
4. **Os dados são o estado atual, não 1 ano de histórico.** Como as cargas são sobrescritas (bug 5), a migração recupera só a última marca de cada exercício. Os gráficos começam a se formar na Etapa 4.
5. **Expo Go e SDK 51:** a versão da loja costuma suportar só SDKs recentes. O celular precisa do Expo Go compatível com o SDK 51 ou de um build próprio. Notificações da Etapa 5 devem ser validadas em build próprio, com permissão de notificação (Android 13+) e de alarme exato (Android 12+).
6. **Os dois apps não se comunicam.** Depois da importação, o que for registrado no antigo não chega ao novo. Trocar de vez, num dia definido.
7. **Há dois celulares.** Emanoela também usa o app; os dados de lá precisam de lista e importação próprias.
8. **Perder outra vez a conta ou o keystore** repetiria o problema: ver seção 9.

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

**Implementação:** API síncrona do `expo-sqlite`, que substitui a fila da Etapa 1; nos testes, o mesmo SQL roda no `better-sqlite3`. Tabelas `STRICT`. A tabela `meta` guarda a flag de migração. Ao adicionar um exercício, o nome normalizado reaproveita o já existente (bug 3).

**Sessão importada:** a que está com `finished_at` NULL é o estado atual do exercício. Duplicatas unidas geram sessões importadas já finalizadas, anteriores a ela. Entre duplicatas, marca com séries vence marca sem séries. Na Etapa 4, finalizar as abertas.

**Entre as Etapas 2 e 4:** as telas atuais leem e editam a sessão `imported` do exercício (criada sob demanda para exercícios novos), mantendo o comportamento. A partir da Etapa 4 ela vira somente leitura.

### Migração (crítica)

O núcleo recebe os dados antigos já lidos, sem saber a origem, e há duas origens:

- **Arquivo de backup importado** (seção 10): o caminho real, pois o app novo começa vazio.
- **Chaves antigas do AsyncStorage**, na primeira abertura com SQLite vazio e sem a flag: mantida para quem tiver dados criados na Etapa 1 (Expo Go ou build de teste).

Nas duas:

1. Lê e valida os JSONs. JSON inválido: aborta, não grava nada, não marca a flag e mostra erro claro.
2. Em **uma transação**: gera IDs, cria exercícios (dedupe por nome normalizado), treinos e vínculos na ordem atual, uma sessão importada por exercício com as séries e a carga atuais, e a flag.
3. Compara contagens e só então confirma.
4. Não altera nem apaga o AsyncStorage.

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
- arquivo importado e AsyncStorage com os mesmos dados geram o mesmo banco
- importação recusada com SQLite não vazio

**Testes:** `jest-expo`, com o repositório sobre uma interface pequena para rodar o mesmo SQL em um SQLite de Node.

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

### Etapa 2: SQLite, repositório, migração, importação e telas atuais adaptadas

Mesmo comportamento visível, mais a importação (seção 10). Aceite: testes da migração verdes, migração validada com o arquivo gerado da lista, conferência com o app antigo e nenhuma tela usando o storage antigo.

O botão de backup lê o AsyncStorage e deixaria de exportar dados atuais quando o SQLite entrar. Nesta etapa ele passa a exportar o SQLite inteiro (formato `version: 2`) e a importação aceita os formatos 1 e 2. Exportar e reimportar em banco vazio deve reproduzir o mesmo banco (teste).

Verificado sem celular: `tsc`, testes automáticos, migração com a lista real e geração do bundle Android. Emanuel testou no celular (Expo Go): tudo passou e os dados importados são iguais aos do app antigo.

### Etapa 2b: identidade e primeiro build do app novo

Seção 9. PR pequeno, só de configuração, quando a Etapa 2 estiver pronta. Até lá, todos os testes são no Expo Go e os dados reais continuam no app antigo.

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

Notas por exercício, substituir exercício só na sessão do dia, atualização do Expo SDK, troca do native-base.

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
| 8 | Duplicatas com marcas diferentes: qual vale? Os dados antigos não têm data | 2 | O relatório da lista transcrita **lista as duplicatas e o Emanuel decide caso a caso**. Se forem muitas, vale a regra: maior carga fica como atual e a outra vira sessão importada anterior |
| 9 | Aprovar os ajustes sugeridos no esquema (seção 6)? | 2 | **Sim** |
| 10 | Package e nome do app novo (seção 9)? | 2b | **`com.emanuellemos.fitnote`, "Fit Note", slug `fit-note`, versão 2.0.0** |
| 11 | Formato da lista e importação (seção 10)? | 2 | **Aprovados**: só com banco vazio, resumo, confirmação, tudo ou nada |
| 12 | Exportação/importação completa já na Etapa 2? | 2 | **Sim** |

## 9. App novo: identidade e chave de assinatura

Valores em `app.json`:

| Campo | Hoje | Novo |
|---|---|---|
| `android.package` | `com.emanuel_alemos.FitNote` | `com.emanuellemos.fitnote` |
| `name` | FitNote | Fit Note |
| `slug` | FitNote | `fit-note` |
| `version` | 1.1.1 | 2.0.0 |
| `extra.eas.projectId` | o da conta perdida | removido; o `eas init` grava o novo |

O package só pode ser trocado antes do primeiro uso real: depois, mudá-lo cria outro app.

Passos do Emanuel (login e chaves não passam pelo Claude nem pelo Git):

1. Criar a conta Expo com um e-mail de acesso garantido, ativar 2FA e guardar senha e códigos de recuperação num gerenciador de senhas. Usar uma organização com Emanoela como segundo membro com permissão de administrar é recomendado.
2. `npx eas-cli login` e, com o `projectId` antigo já removido, `npx eas-cli init`.
3. `npx eas-cli build -p android --profile preview`, deixando o EAS gerar o keystore.
4. **Antes de usar o app de verdade:** `npx eas-cli credentials -p android` → perfil `preview` → baixar as credenciais para o computador (`credentials.json` + keystore). Guardar o `.jks`, as senhas do keystore e da chave, e o alias, em dois lugares fora do computador. Anotar o SHA-256.
5. Provar o backup: `keytool -list -v -keystore <arquivo>.jks` deve abrir com a senha guardada e mostrar o mesmo SHA-256 que `apksigner verify --print-certs` mostra no APK.
6. Provar a atualização: gerar um segundo build e instalar por cima, com dados de teste, antes de importar os reais.

No Git: `*.jks`, `*.keystore`, `credentials.json`, `credentials/`, listas e backups são ignorados. O perfil `preview` usa `autoIncrement`, para cada APK ter versionCode maior que o anterior. O `eas init` altera o `app.json` (`projectId` e `owner`): incluir essa mudança no PR da Etapa 2b.

### Rodar no Expo Go até o primeiro build

Expo Go **2.31.2** (SDK 51; a versão da loja não serve; atualização automática desligada). Neste computador o IP precisa ser informado, e `--offline` evita o login na conta antiga:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<IPv4 do Wi-Fi>"
npx expo start --offline
```

## 10. Dados do app antigo: da lista ao app novo

### Formato da lista

Um arquivo de texto UTF-8 por pessoa, `fitnote-lista-<pessoa>.txt`, fora do Git:

```text
# Upper A
Supino reto | 22,5 | 10 8 7
Remada curvada | 40 | 12 12 10
Elevação lateral | 8 | -

# Upper B
Supino reto
```

- `# Nome` abre um treino. Treinos e exercícios na ordem da tela.
- Exercício: `nome | carga em kg | repetições de cada série`. `-` = nenhuma série.
- Exercício que se repete em outro treino: só o nome basta.
- Nome exatamente como aparece no app, inclusive acentos e erros de digitação.
- Carga com vírgula ou ponto. O app antigo truncava decimais: é a hora de escrever o valor real.

### Extração pelo adb

O `uiautomator dump` lê cada tela; `input tap` só abre treinos e exercícios, `input swipe` rola e a tecla Voltar sai. Nunca tocar em +, −, editar, excluir ou carga. Parar se houver outra janela em foco, modal, alerta, campo de texto ou tela inesperada. Celular parado, com Não perturbe. Duas passagens completas precisam ser idênticas.

**Emanuel: concluída e aprovada.** 4 treinos, 22 exercícios, 65 séries, 27 vínculos; duas passagens idênticas; nenhuma duplicata. O treino "Lower B" foi excluído pelo Emanuel antes da leitura e fica de fora. Lista e leituras ficam em `Documents/FitNote-dados`, fora do Git. O script `npm run lista` deve chegar a esses mesmos totais.

Conferido na Etapa 2: lista, backup gerado, migração no SQLite de Node e leitura bruta do celular têm os mesmos valores.

**Emanoela: pendente**, com o mesmo processo no celular de Emanoela. A decisão 8 pode se aplicar lá.

### Script no computador

`npm run lista -- fitnote-lista-emanuel.txt` gera `fitnote-backup-<data>.json` no mesmo formato do botão de backup (versão 1), com `source: "transcricao"`. Não altera a lista e não usa rede.

- **Erro, não gera arquivo:** linha ilegível, treino repetido, exercício repetido no mesmo treino, exercício sem dados em nenhum lugar, ou mesmo nome com valores diferentes (pode ser digitação ou dois exercícios iguais na aparência, como "Supino" e "Supino " com espaço).
- **Aviso, gera arquivo:** nomes iguais após normalizar ("maquina" / "máquina"), com carga, séries e treinos de cada um. Decisão 8: caso a caso, corrigindo a própria lista; sem correção, vale a regra.
- **Sempre:** relatório no formato das telas e totais, para conferir com o app antigo.

### Importação no app novo

Na tela inicial vazia, abaixo de "ADICIONE SEU TREINO", a opção discreta "Importar backup" abre o seletor de arquivos (`expo-document-picker`). Não adiciona toques durante o treino.

1. Lê e valida o arquivo inteiro.
2. Mostra o resumo ("5 treinos, 32 exercícios, 96 séries, 1 duplicata") e pede confirmação.
3. Executa a migração em uma transação. Erro: nada é gravado.

Só aparece e só roda com o banco vazio; nunca mistura nem sobrescreve. Para refazer, reinstalar o app **novo** antes de usá-lo.

### Roteiro da troca

1. Lista do Emanuel pronta, para testar. O script e o teste de migração no SQLite de Node rodam com o arquivo (`FITNOTE_BACKUP`).
2. Testar a importação no Expo Go ou build de teste.
3. No dia da troca: atualizar na lista o que mudou (repetindo a extração), gerar o arquivo, importar e conferir todos os treinos com o app antigo lado a lado.
4. Repetir no celular de Emanoela com a lista de lá.
5. Manter o app antigo instalado, sem uso, até algumas semanas de uso normal e um backup exportado do app novo.

Mockups: https://claude.ai/artifact/C4TgGYGhYBc8rowCmznTez (as descrições deste plano bastam; se algo ficar ambíguo, perguntar).
