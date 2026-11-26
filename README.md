# Fit Note 🏋️‍♂️📔

O **Fit Note** é um aplicativo mobile de musculação que substitui o caderno de anotações da academia. Ele foi feito para facilitar a **sobrecarga progressiva**: chegar no exercício, ver rápido o que você fez da última vez e tentar superar.

---

## O Time
Este é um projeto colaborativo entre engenharia de software e design:
- **Desenvolvimento:** [Emanuel Lemos](https://www.linkedin.com/in/emanuel-ara%C3%BAjo-lemos/)
- **UI/UX Design:** [Emanoela Maciel](https://www.linkedin.com/in/emanoela-maciel-5478b6279/)

---

## O Problema e a Solução
Muitos aplicativos de treino são complexos ou não compartilham dados entre rotinas diferentes (ex.: Upper/Lower).
No **Fit Note**, cada exercício é único e compartilhado entre os treinos. Se você progride no Supino na segunda-feira (Upper A), essa marca aparece como "última vez" na quinta-feira (Upper B).

A regra de design é uma pergunta: **"isso adiciona toques durante o treino?"** Se adiciona, é opcional ou fica fora da tela principal.

## Funcionalidades
- **Última vez em todo lugar:** cada exercício mostra a última marca ("Última: 22 kg · 10/8/7"), venha de qual treino vier.
- **Séries pré-preenchidas:** as séries de hoje já vêm com as repetições da última vez. Se foi igual, basta tocar em ✓.
- **Treinos com data:** o primeiro ✓ inicia o treino. Ao finalizar, um resumo mostra duração, volume, recordes e a comparação com o treino anterior.
- **Timer de descanso:** começa no ✓, com −15s, +15s e Pular. Avisa com vibração, mesmo com a tela bloqueada.
- **Histórico com gráfico:** carga, repetições ou volume em 1, 3, 6 ou 12 meses, com o recorde destacado.
- **Organização:** renomear e reordenar treinos e exercícios (arrastando pela alça ⋮⋮), carga por série e faixa alvo de repetições.
- **100% offline:** os dados ficam só no celular, com exportação e importação de backup.

## Tecnologias
- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/) (SDK 51) e [TypeScript](https://www.typescriptlang.org/) em modo estrito
- [expo-sqlite](https://docs.expo.dev/versions/v51.0.0/sdk/sqlite/) para os dados locais
- [React Navigation](https://reactnavigation.org/) (native-stack) e [NativeBase](https://nativebase.io/) na interface
- [expo-notifications](https://docs.expo.dev/versions/v51.0.0/sdk/notifications/) para o aviso do fim do descanso
- [react-native-svg](https://github.com/software-mansion/react-native-svg) para os gráficos
- [react-native-draggable-flatlist](https://github.com/computerjazz/react-native-draggable-flatlist) para reordenar
- [Jest](https://jestjs.io/) com [better-sqlite3](https://github.com/WiseLibs/better-sqlite3): os testes rodam o mesmo SQL do app
- [EAS Build](https://docs.expo.dev/build/introduction/) para gerar o APK

---

## Arquitetura e Decisões Técnicas
1. **Camada de dados única** (`src/database/`): as telas não escrevem SQL. Elas chamam um repositório que expõe operações como "concluir série" e "finalizar treino". Cada escrita roda numa transação.
2. **SQLite síncrono:** cada operação termina antes da próxima, então toques rápidos em + e − não perdem dados. A mesma interface `Database` roda no `expo-sqlite` no app e no `better-sqlite3` nos testes.
3. **Histórico em vez de sobrescrita:** cada treino é uma sessão com séries datadas. A "última vez", o resumo e os gráficos são consultas sobre esse histórico.
4. **Estado que sobrevive ao app fechado:** o treino em andamento e o horário de término do descanso ficam no banco, não em memória.
5. **Migração segura:** os dados da versão 1 (AsyncStorage) são migrados tudo ou nada, sem apagar as chaves antigas. O backup exportado reproduz o banco inteiro.
6. **Componentização:** a interface é feita de componentes reutilizáveis, baseados no design system da designer.

O plano completo, com as decisões e o andamento, está em [`docs/PLANO.md`](docs/PLANO.md).

## Roadmap
- [x] Migração para **SQLite**, com histórico de longo prazo
- [x] **Gráficos de performance** por exercício
- [x] **Drag & drop** para reordenar treinos e exercícios
- [x] **Cronômetro de descanso** integrado
- [ ] Notas por exercício
- [ ] Trocar um exercício só na sessão do dia
- [ ] Atualizar o Expo SDK e substituir o NativeBase

---

## Como rodar o projeto
1. Clone o repositório: `git clone https://github.com/EmanuelALemos/fit-note.git`
2. Instale as dependências: `npm install`
3. Inicie o Expo: `npx expo start`
4. Abra no celular com o **Expo Go compatível com o SDK 51** (versão 2.31.x). A versão atual da loja não abre projetos do SDK 51.

Outros comandos:
- `npm test`: testes automáticos
- `npx tsc --noEmit`: checagem de tipos
- `npx eas-cli build -p android --profile preview`: gera o APK (exige acesso ao projeto no EAS)

As versões instaladas são marcadas com tags `vX.Y.Z` e publicadas em [Releases](https://github.com/EmanuelALemos/fit-note/releases).
