# Fit Note 🏋️‍♂️📔

O **Fit Note** é um aplicativo mobile focado em musculação que substitui o tradicional caderno de anotações por uma interface inteligente e intuitiva. O projeto foi desenvolvido para facilitar a **Sobrecarga Progressiva**, permitindo que o usuário acompanhe e evolua suas cargas e repetições de forma consistente.

---

## O Time
Este é um projeto colaborativo entre engenharia de software e design:
- **Desenvolvimento:** [Emanuel Lemos](https://www.linkedin.com/in/emanuel-ara%C3%BAjo-lemos/)
- **UI/UX Design:** [Emanoela Maciel](https://www.linkedin.com/in/emanoela-maciel-5478b6279/)

---

## O Problema e a Solução
Muitos aplicativos de treino são complexos ou não permitem a sincronização de dados entre diferentes rotinas (ex: Upper/Lower). 
O **Fit Note** resolve isso ao centralizar os dados dos exercícios. Se você progride no Supino Reto na segunda-feira (Upper A), essa nova marca estará lá automaticamente na quinta-feira (Upper B).

## Funcionalidades Principais
- **Sincronização Inteligente:** Exercícios compartilhados entre treinos mantêm os dados atualizados em tempo real.
- **Modo Offline:** Persistência local robusta para uso em academias com sinal instável.
- **Foco em Progressão:** Interface desenhada para que o usuário veja seu último desempenho antes de iniciar a série atual.
- **Design Minimalista:** UI focada na rapidez de inserção de dados durante o descanso do treino.

## Tecnologias Utilizadas
- [React Native](https://reactnative.dev/) com [Expo Go](https://expo.dev/)
- [TypeScript](https://www.typescriptlang.org/) (Tipagem estrita para segurança de dados)
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) para persistência local
- [React Navigation](https://reactnavigation.org/) para fluidez entre telas

---

## Arquitetura e Decisões Técnicas
Foquei em criar um código sustentável:
1. **Componentização:** UI construída com componentes reutilizáveis baseados no Design System criado pela designer.
2. **Estado Global:** Gerenciamento eficiente para garantir que a atualização de um exercício reflita em toda a aplicação.
3. **Build Real:** O app possui build estável (.apk) e é utilizado diariamente em ambiente real há mais de um ano.

## Roadmap de Evolução
- [ ] Migração para **SQLite** para suporte a histórico de longo prazo.
- [ ] Implementação de **Gráficos de Performance** por grupo muscular.
- [ ] Sistema de **Drag & Drop** para reordenar exercícios na lista.
- [ ] Cronômetro de descanso integrado.

---

## Como rodar o projeto
1. Clone o repositório: `git clone https://github.com/seu-usuario/fit-note.git`
2. Instale as dependências: `npm install` ou `yarn`
3. Inicie o Expo: `npx expo start`
4. Escaneie o QR Code com o app **Expo Go** no seu celular.
