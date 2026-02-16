# 🛒 Flow Finance

> Sistema moderno de controle de vendas, estoque e financeiro para microempreendedores.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![PWA](https://img.shields.io/badge/PWA-ready-orange)

## 📖 Sobre o Projeto

O **Flow Finance** é uma solução completa e intuitiva projetada para ajudar pequenos negócios e autônomos a gerenciar suas operações diárias. Ele resolve o problema da desorganização financeira e do controle de estoque manual, oferecendo uma plataforma digital que funciona em qualquer dispositivo.

O sistema foca em simplicidade e "mobile-first", permitindo que o empreendedor registre vendas, consulte devedores e verifique o estoque diretamente do celular, mesmo sem conexão com a internet.

### ✨ Funcionalidades Principais

- ✅ **Gestão de Vendas e Pedidos** - Controle total de reservas (encomendas) e vendas pronta entrega.
- ✅ **Controle de Estoque** - Gestão de produtos com baixa automática após vendas.
- ✅ **Carteira de Clientes** - Cadastro de clientes e histórico de compras.
- ✅ **Controle de Devedores** - Visualização clara de contas a receber e pagamentos parciais.
- ✅ **Dashboard Financeiro** - Gráficos e indicadores de desempenho (faturamento, lucro, top produtos).
- ✅ **Orçamentos** - Criação e gestão de orçamentos para clientes.
- ✅ **PWA (Offline-first)** - Funciona sem internet com sincronização de dados local via IndexedDB.

## 📸 Screenshots

### Tela Principal e Dashboard
*Screenshots serão adicionados em breve*

### Gestão de Reservas
*Screenshots serão adicionados em breve*

## 🛠️ Tecnologias Utilizadas

### Core
- **[React 18](https://react.dev/)** - Biblioteca UI robusta e performática.
- **[TypeScript](https://www.typescriptlang.org/)** - Segurança de tipos e melhor experiência de desenvolvimento.
- **[Vite](https://vitejs.dev/)** - Build tool e servidor de desenvolvimento ultra-rápido.

### UI/UX
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilização moderna e responsiva utility-first.
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes de interface acessíveis e elegantes.
- **[Radix UI](https://www.radix-ui.com/)** - Primitivos de UI acessíveis (base do shadcn).
- **[Lucide Icons](https://lucide.dev/)** - Ícones vetoriais leves e consistentes.
- **[Recharts](https://recharts.org/)** - Biblioteca de gráficos composta para React.

### Estado e Dados
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Gerenciamento de estado global leve e escalável.
- **[Dexie.js](https://dexie.org/)** - Wrapper para IndexedDB, garantindo persistência local robusta.
- **[TanStack Query](https://tanstack.com/query)** - Gerenciamento eficiente de estado assíncrono e cache.
- **[React Hook Form](https://react-hook-form.com/)** - Gestão de formulários performática.
- **[Zod](https://zod.dev/)** - Validação de esquemas e tipos.

### Qualidade e Ferramentas
- **[ESLint](https://eslint.org/)** - Padronização e linting de código.
- **[Prettier](https://prettier.io/)** - Formatação automática de código.

## 🏗️ Arquitetura

### Estrutura de Pastas
```
src/
├── components/          # Componentes da aplicação
│   ├── ui/             # Componentes base reutilizáveis (shadcn/ui)
│   ├── pedidos/        # Componentes específicos de pedidos
│   ├── PagamentoModal.tsx
│   ├── Sidebar.tsx
│   └── ...
├── pages/              # Páginas/Rotas da aplicação
│   ├── Dashboard.tsx   # Visão geral e métricas
│   ├── Pedidos.tsx     # Gestão de vendas (reservas/pronta entrega)
│   ├── Clientes.tsx    # Cadastro de clientes
│   ├── Produtos.tsx    # Estoque
│   ├── Orcamento.tsx   # Gestão de orçamentos
│   └── Devedores.tsx   # Controle de inadimplência
├── lib/                # Utilitários e configurações
│   ├── db.ts           # Configuração do Dexie (IndexedDB)
│   ├── db-operations.ts # Camada de abstração de banco de dados
│   ├── utils.ts        # Funções auxiliares gerais (cn, formatters)
│   └── ...
├── hooks/              # Custom Hooks (useToast, useMobile, etc)
├── store/              # Stores globais (Zustand)
├── types/              # Definições de tipos TypeScript globais
└── App.tsx             # Componente raiz e roteamento
```

### Fluxo de Dados
A aplicação utiliza uma arquitetura "Local-First". Os dados são persistidos localmente no navegador do usuário usando **IndexedDB** (via Dexie.js). O estado da UI é gerenciado via **Zustand** e **React Query**, garantindo que as interfaces reajam instantaneamente às mudanças de dados sem necessidade de recarregamento.

### Decisões Técnicas
- **Vite**: Escolhido pela velocidade de inicialização e HMR, crucial para uma boa experiência de desenvolvimento.
- **shadcn/ui**: Permite ter componentes de alta qualidade visual e acessibilidade sem ficar preso a uma biblioteca de componentes "caixa preta", pois o código é dono do projeto.
- **IndexedDB**: Escolhido para garantir que o sistema funcione 100% offline, essencial para usuários móveis ou em áreas com conexão instável.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** - versão 18.x ou superior
```bash
  node --version  # deve retornar v18.x.x ou superior
```

- **npm**, **pnpm** ou **yarn**
```bash
  npm --version
```

- **Git** (para clonar o repositório)
```bash
  git --version
```

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/flow-finance.git
cd flow-finance
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:8080** (ou porta indicada no terminal)

### 4. Build para produção
```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/`.

## 📜 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Gera build de produção otimizado
npm run build:dev    # Gera build em modo de desenvolvimento
npm run preview      # Visualiza o build de produção localmente
npm run lint         # Executa verificação de código (ESLint)
npm run test         # Executa testes unitários (Vitest)
npm run test:watch   # Executa testes em modo watch
```

## 💡 Como Usar

### Gestão de Vendas

#### Criar Nova Reserva
1. Vá para a aba **Vendas**.
2. Clique no botão azul **"+ Nova Reserva"**.
3. Selecione o cliente e adicione os produtos.
4. Clique em **Confirmar**.

#### Registrar Pagamento Parcial
1. Acesse a página **Devedores** (ou Financeiro).
2. Localize a dívida do cliente.
3. Clique em **"Registrar Pagamento"**.
4. Insira o valor pago e confirme. O saldo devedor será atualizado.

#### Entregar Produtos
1. Na aba **Vendas > Reservados**.
2. No card do pedido, clique em **"Entregar"** no item específico.
3. Ou use o botão **"Entregar Todos"** para baixar todo o pedido e movê-lo para concluído.

### Gestão de Estoque
1. Acesse a página **Produtos**.
2. Cadastre novos produtos com preço de custo e venda.
3. Acompanhe a quantidade disponível (atualizada automaticamente com as vendas).

## 📱 Progressive Web App (PWA)

Este projeto é um PWA completo:

✅ **Instalável**: Pode ser instalado como um app nativo no PC ou Celular.
✅ **Offline-first**: Todo o banco de dados roda localmente no dispositivo.
✅ **Responsivo**: Interface adaptada para qualquer tamanho de tela.

### Como Instalar
- **Android (Chrome):** Menu > "Instalar aplicativo" ou "Adicionar à tela inicial".
- **iOS (Safari):** Botão Compartilhar > "Adicionar à Tela de Início".
- **Desktop (Chrome/Edge):** Clique no ícone de instalação na barra de endereços.

## 🧪 Testes

O projeto utiliza **Vitest** para testes unitários.

```bash
npm run test        # Executa todos os testes
npm run test:watch  # Modo interativo
```

## 🌐 Deploy

### Vercel / Netlify
Como é uma SPA (Single Page Application), pode ser hospedada gratuitamente em qualquer provedor de conteúdo estático.

1. Faça o build: `npm run build`
2. Faça o deploy da pasta `dist/`.

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Adiciona nova feature'`)
4. Push para a Branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 🗺️ Roadmap

### ✅ Versão 1.0 (Atual)
- [x] Gestão completa de reservas e pronta entrega
- [x] Controle de estoque básico
- [x] Cadastro de clientes e orçamentos
- [x] Funcionamento Offline (PWA)

### 🚧 Versão 1.1 (Planejado)
- [ ] Relatórios financeiros avançados (DRE, Curva ABC)
- [ ] Backup automático em nuvem (Google Drive/Dropbox)
- [ ] suporte a código de barras
- [ ] Modo escuro (Dark Mode)

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo LICENSE para mais detalhes.

## 👥 Autores

- **Flow Finance Team** - *Desenvolvimento e Design*

---
⭐ Se este projeto te ajudou, considere dar uma estrela no repositório!
