# Correções v2 — Flow Finance

> **Última atualização:** 05/05/2026
> **Status:** Pendente

---

## 🔴 Crítico — Integridade de Dados

### 1. Conflito de dados no login entre dispositivos

**Problema:** O sistema sempre prioriza os dados do dispositivo sobre a nuvem. Isso causa três falhas graves:

| Cenário | Resultado |
|---|---|
| Usuário loga em dispositivo com dados de outra pessoa | Dados errados sobrescrevem a nuvem do usuário |
| Usuário loga em dispositivo sem dados | Conta na nuvem é sobrescrita com dados vazios |
| Dados de teste no cache + cliente loga no mesmo navegador | Dados fictícios sobem para a conta real do cliente |

**Causa raiz:** O sync engine não verifica a quem pertencem os dados locais antes de fazer upload. O cache do navegador não tem consciência de sessão.

**Solução esperada:**
- Vincular todo dado local ao `user_id`
- No login, limpar dados locais do usuário anterior antes de qualquer sync
- Adotar política "Cloud-wins" no momento do login (nuvem é a fonte da verdade)
- Bloquear upload até que o primeiro download do usuário atual seja concluído

---

## 🟡 Médio — Persistência e Salvamento

### 2. Edição de data de reserva não persiste

**Problema:** Ao editar a data de uma reserva existente, a alteração não é salva corretamente.

### 3. Dados novos não persistem após atualização

**Problema:** Ao salvar novos registros (clientes, doces, etc.), os dados desaparecem ao atualizar a página. Indica falha na gravação no armazenamento local ou na sincronização.

---

## 🟢 UX — Prevenção de Erros

### 4. Duplo clique duplica dados

**Problema:** Ao clicar/tocar em um botão de salvar, o usuário pode acionar a ação múltiplas vezes, causando duplicação de registros.

**Solução esperada:** Desabilitar o botão imediatamente após o primeiro clique, reabilitando somente após a conclusão (ou falha) da operação.