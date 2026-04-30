# 🧠 MASTER PROMPT — Execução de Fase do Plano de Migração

---

## Contexto do Projeto

Você está trabalhando no projeto **Flow Finance**, um PWA (Vite + React 18 + TypeScript + Zustand + Dexie.js + TailwindCSS + Radix UI) localizado em:

```
d:\Freela\SERVIÇOS\Projetos Concluídos\Controle de vendas - Concluído
```

O plano de migração completo está documentado em:
**@contextScopeItemMention **

O ranking de complexidade por fase está em:
**@contextScopeItemMention **

---

## Diretivas de Engenharia de Software

Ao executar qualquer fase, você **DEVE** seguir rigorosamente:

### 1. Leitura Obrigatória (Antes de Qualquer Código)
- **Leia o `implementation_plan.md`** da fase solicitada — entenda TODOS os arquivos `[NEW]` e `[MODIFY]`.
- **Leia os arquivos existentes** que serão modificados — nunca assuma o conteúdo, sempre use `view_file`.
- **Leia os tipos em `src/types/index.ts`** — garanta que todo código novo respeite as interfaces existentes.
- **Leia o `src/lib/db.ts`** — entenda o schema Dexie atual antes de interagir com o banco.

### 2. Princípios de Código
- **TypeScript estrito:** Nunca use `any` sem justificativa explícita. Prefira tipos específicos, generics e interfaces.
- **DRY:** Se um padrão se repete 3+ vezes, extraia para uma função utilitária.
- **Single Responsibility:** Cada função/componente faz UMA coisa. Se ultrapassar ~80 linhas, divida.
- **Tratamento de erros:** Todo `async/await` DEVE ter `try/catch` com mensagens descritivas. Nunca engula erros silenciosamente.
- **Nomes em inglês** para variáveis, funções e componentes. Strings voltadas ao usuário em **português do Brasil**.

### 3. Segurança (Obrigatório)
- **Nunca** exponha `service_role` key, tokens ou credenciais no código frontend.
- **Sanitize** toda entrada do usuário antes de gravar no banco ou renderizar (prevenção XSS/CSV injection).
- **Valide** dados tanto no frontend (Zod) quanto confie no RLS do Supabase no backend.
- **Nunca** construa queries SQL concatenando strings — use sempre os métodos do SDK.
- Variáveis sensíveis vão em `.env.local` e **DEVEM** estar no `.gitignore`.

---

## Protocolo Anti-Alucinação

> [!CAUTION]
> Estas regras existem para impedir que você invente código, APIs ou estruturas que não existem no projeto.

| Regra | Descrição |
|-------|-----------|
| **Leia antes de escrever** | Antes de modificar qualquer arquivo, use `view_file` para ler o conteúdo ATUAL. Nunca assuma. |
| **Verifique imports** | Antes de importar um módulo, confirme que ele existe no projeto com `list_dir` ou `grep_search`. |
| **Verifique APIs** | Antes de usar qualquer método de biblioteca (xlsx, supabase-js, zod), consulte a documentação via Context7. |
| **Não invente campos** | Use APENAS campos que existem nas interfaces em `src/types/index.ts` e no schema de `src/lib/db.ts`. |
| **Não invente rotas** | Use APENAS rotas que já existem em `src/App.tsx` ou que o plano explicitamente manda criar. |
| **Confirme dependências** | Antes de usar `import { X } from 'lib'`, verifique se `lib` está no `package.json`. Se não estiver, instale primeiro. |
| **Teste incremental** | Após cada arquivo criado/modificado, explique o que mudou e como verificar que funciona. |

---

## Protocolo de Execução por Fase

### Etapa 1 — Preparação
1. Leia a seção da fase no `@contextScopeItemMention `
2. Verifique a pasta @contextScopeItemMention e utilize todas as ferramentas pertinentes que encontrar na pasta para executar a fase vigente.
3. Liste TODOS os arquivos que serão criados `[NEW]` e modificados `[MODIFY]`
4. Leia o conteúdo atual de cada arquivo `[MODIFY]` com `view_file`
5. Verifique se há dependências npm a instalar

### Etapa 2 — Implementação
5. Instale dependências necessárias (`npm install ...`)
6. Crie os arquivos `[NEW]` na ordem de dependência (utilitários primeiro, componentes depois)
7. Modifique os arquivos `[MODIFY]` usando edições cirúrgicas (nunca reescreva o arquivo inteiro)
8. Mantenha TODOS os comentários e docstrings existentes que não são afetados pela mudança

### Etapa 3 — Verificação
9. Execute `npm run build` para garantir que compila sem erros
10. Percorra o **checklist de verificação** da fase no plano — item por item
11. Liste o que foi feito em formato de resumo com links para os arquivos

### Etapa 4 — Relatório Final
12. Apresente um resumo estruturado:
    - ✅ Arquivos criados
    - ✏️ Arquivos modificados
    - 📦 Dependências instaladas
    - ⚠️ Pontos de atenção ou débitos técnicos
    - 🧪 Itens do checklist de verificação e seus resultados

---

## Restrições Absolutas

- **NÃO** pule etapas do plano. Execute EXATAMENTE o que está descrito para a fase solicitada.
- **NÃO** antecipe código de fases futuras (ex: não crie o AuthContext na Fase 0).
- **NÃO** delete ou renomeie arquivos que não estão marcados para deleção na fase atual.
- **NÃO** modifique o schema do banco (Dexie) a menos que o plano da fase mande explicitamente.
- **NÃO** crie arquivos de teste a menos que solicitado.
- **Fale SEMPRE em português do Brasil** na comunicação.

---

## Comando de Execução


> **Execute apenas a Fase 0**