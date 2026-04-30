# 🏆 Ranking de Complexidade das Fases de Migração

| Rank | Fase | Nome | Status | Justificativa |
|:---:|:---:|------|:---:|---|
| 🥇 1° | **Fase 3** | Sync Engine | 🔴 **Muito Complexo** | Coração do sistema. Envolve dual-write (Dexie + Supabase), fila de operações offline, detecção de conectividade, mapeamento camelCase↔snake_case em ~17 campos, refatoração do `db-operations.ts` + `useStore.ts` + 2 services. Qualquer bug aqui causa perda de dados ou dessincronização. |
| 🥈 2° | **Fase 4** | Import XLSX → Supabase | 🟠 **Complexo** | Operação reversa do export, mas com camadas extras: deserialização de JSON embutido em células, validação Zod por tabela, inserção em batches respeitando ordem de FK (6 etapas), detecção de duplicatas, e tratamento de erros parciais (rollback vs skip). |
| 🥉 3° | **Fase 2** | Autenticação | 🟡 **Neutro** | Fluxo padrão e bem documentado pelo Supabase SDK. O SDK cuida do PKCE, refresh de token e persistência de sessão. O trabalho real é criar os formulários (Login/Register), o AuthContext e o AuthGuard — tudo previsível e sem grandes surpresas. |
| 4° | **Fase 0** | Backup (DB + XLSX) | 🟡 **Neutro** | Operações de leitura sem risco de perda de dados. A lib `xlsx` faz o trabalho pesado. A complexidade vem da sheet "Devedores" (cruzamento de pedidos + clientes + cálculo de dias em atraso) e da sanitização contra CSV injection, mas nada imprevisível. |
| 5° | **Fase 1** | Schema + RLS | 🟢 **Trivial** | SQL repetitivo. São 11 `CREATE TABLE` seguindo o mesmo padrão e 4 policies RLS idênticas por tabela (copy-paste com troca do nome). Sem lógica, sem edge cases — apenas tradução do schema Dexie para Postgres. |
| 6° | **Fase 5** | Polish & Hardening | 🟢 **Trivial** | Deletar 4 arquivos, mover botões na UI, e rodar checklist de segurança. Nenhuma lógica nova — apenas limpeza e verificação. |

---

## Resumo Visual

```text
Muito Complexo  🔴 ████████████████████ Fase 3 (Sync Engine)
Complexo        🟠 ██████████████░░░░░░ Fase 4 (Import XLSX)
Neutro          🟡 ██████████░░░░░░░░░░ Fase 2 (Auth)
Neutro          🟡 ████████░░░░░░░░░░░░ Fase 0 (Backup)
Trivial         🟢 ████░░░░░░░░░░░░░░░░ Fase 1 (Schema/RLS)
Trivial         🟢 ███░░░░░░░░░░░░░░░░░ Fase 5 (Polish)
```

> **Conclusão:** ~70% do esforço real está concentrado nas **Fases 3 e 4**. A Fase 3 (Sync Engine) é de longe a mais crítica — é onde mora o risco de bugs sutis (dados perdidos, sync duplicado, conflitos offline). As demais são previsíveis e seguem padrões bem estabelecidos.
