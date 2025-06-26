# Dash Boat Tour

[![Deploy Railway](https://img.shields.io/badge/Deploy-Railway-blue?logo=railway)](https://dashboat-production.up.railway.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Site institucional para reservas de passeios de barco de luxo em Búzios, Cabo Frio e Arraial do Cabo.

---

## Índice
- [Visão Geral](#visão-geral)
- [Acesso ao Projeto Online](#acesso-ao-projeto-online)
- [Acesso ao Painel Admin](#acesso-ao-painel-admin)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Ferramentas de Qualidade e Monitoramento](#ferramentas-de-qualidade-e-monitoramento)
- [Scripts NPM Úteis](#scripts-npm-úteis)
- [Arquitetura e Organização](#arquitetura-e-organização)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Uso Local](#instalação-e-uso-local)
- [Testes Automatizados](#testes-automatizados)
- [Build e Deploy](#build-e-deploy)
- [Contribuição](#contribuição)
- [Licença](#licença)
- [Contato](#contato)

---

## Visão Geral
O Dash Boat Tour é um site institucional responsivo para reservas de passeios de barco de luxo, com painel administrativo, otimização de imagens, segurança e automação de backups. O projeto foi desenvolvido para promover experiências marítimas inesquecíveis, focando em usabilidade, performance e segurança.

---

## Acesso ao Projeto Online

- **Site público:** [https://dashboat-production.up.railway.app](https://dashboat-production.up.railway.app)
- **Painel Admin:** [https://dashboat-production.up.railway.app/admin](https://dashboat-production.up.railway.app/admin)

## Acesso ao Painel Admin

1. Acesse o painel admin pelo link acima.
2. Faça login com as credenciais padrão:
   - **Usuário:** `admin`
   - **Senha:** `password`
3. Após login, você terá acesso ao painel de reservas, contatos e estatísticas.

---

## Funcionalidades
- Página institucional responsiva
- Formulário de reserva com validação
- Painel administrativo para gestão de reservas e contatos
- Carrossel de destinos turísticos
- Otimização de imagens (WebP)
- Segurança com Helmet, Rate Limit e autenticação JWT
- Logs e backups automáticos

---

## Tecnologias Utilizadas
- **Node.js** (backend)
- **Express**
- **JavaScript** (ES6+)
- **HTML5 & CSS3 / SCSS**
- **Bootstrap**
- **Jest** (testes)
- **Nodemailer** (e-mail)
- **JWT** (autenticação)
- **Helmet, CORS, Rate Limit** (segurança)
- **Lighthouse** (auditoria de performance)
- **Railway** (deploy cloud)

---

## Ferramentas de Qualidade e Monitoramento
- **ESLint** e **Prettier**: Garantem código limpo e padronizado.
- **Husky** + **lint-staged**: Executam lint e formatação automaticamente nos commits.
- **Sentry**: Monitoramento de erros em produção.
- **Webpack** + **Babel**: Bundling e transpilação moderna de JS.
- **Nodemon**: Hot reload no desenvolvimento.
- **Cross-env**: Gerenciamento de variáveis de ambiente multiplataforma.
- **Playwright** e **Puppeteer**: Testes E2E e automação de navegação.

---

## Scripts NPM Úteis
- `npm run dev` — Desenvolvimento com hot reload (Nodemon)
- `npm start` — Inicia o servidor em produção
- `npm run build` — Gera build otimizado em `dist/`
- `npm run lint` — Lint dos arquivos JS
- `npm run lint:fix` — Corrige problemas de lint automaticamente
- `npm run format` — Formata o código com Prettier
- `npm test` — Executa testes automatizados (Jest)
- `npm run bundle` — Gera bundles com Webpack
- `npm run bundle:dev` — Webpack em modo desenvolvimento

---

## Arquitetura e Organização
- **Estrutura modular**: Separação clara entre backend (`js/`), frontend (`src/js/`), middlewares, services, configs e rotas.
- **Services**: Serviços para dados, e-mail e logs.
- **Middlewares**: Autenticação, segurança e validação.
- **Configurações**: Arquivos dedicados para segurança e variáveis de ambiente.
- **Testes**: Cobertura de API, autenticação e fluxos principais.
- **Monitoramento**: Sentry integrado para rastreamento de erros.
- **Deploy**: Railway com healthcheck e restart automático.

---

## Pré-requisitos
- **Node.js** v18+ (recomendado)
- **npm** v9+
- (Opcional) Conta de e-mail para envio de notificações
- Variáveis de ambiente configuradas (ver `.env.example`)

---

## Instalação e Uso Local
1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/dashboat-tour.git
   cd dashboat-tour
   ```
2. **Instale as dependências:**
   ```bash
   npm install
   ```
3. **Configure as variáveis de ambiente:**
   - Copie `.env.example` para `.env` e preencha os campos necessários.
4. **Rode o servidor local:**
   ```bash
   npm run dev
   # ou
   npm start
   ```
   O site estará disponível em [http://localhost:5000](http://localhost:5000)
   Para acessar o admin localmente: [http://localhost:8080/admin](http://localhost:8080/admin)

---

## Testes Automatizados
- Execute os testes com:
  ```bash
  npm test
  ```
- Testes cobrem API de reservas, contatos e autenticação.

---

## Build e Deploy
- O build copia arquivos para a pasta `dist/`.
- Deploy automatizado via Railway (ver `railway.json`).
- Healthcheck e restart automático configurados para produção.

---


## Licença
MIT. Veja o arquivo [LICENSE](./LICENSE).

---

### Contato
- [LinkedIn](https://www.linkedin.com/in/lucas-leao-shvzn)
- [GitHub](https://github.com/shivinhazen)
- [Email](mailto:lucasleaobcmt@gmail.com)
