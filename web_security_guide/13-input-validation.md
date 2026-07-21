# Input Validation — Guia Detalhado

Validação de entrada é a prática de verificar se todo input recebido corresponde ao que é esperado. Primeira linha de defesa contra XSS, SQL injection, command injection, e outros.

## 1. Allowlist vs Denylist

| Abordagem | Como Funciona | Confiabilidade |
|-----------|--------------|----------------|
| **Allowlist** | Define valores permitidos, nega todo o resto | ✅ Mais seguro — default deny |
| **Denylist** | Define valores proibidos, permite todo o resto | ❌ Menos seguro — fácil de contornar |

**Exemplo allowlist (range 0–10):**
```js
function checkRange(input) {
  if (input >= 0 && input <= 10) return true;
  return false;
}
```

## 2. Syntactic vs Semantic Validation

| Tipo | O que verifica | Exemplo |
|------|---------------|---------|
| **Syntactic** | Formato correto | É um número? É um email válido? |
| **Semantic** | Conteúdo dentro de limites esperados | Número entre 1–100? String em conjunto permitido? |

## 3. Client-Side Validation (UX)

**HTML attributes:**
| Attribute | Uso |
|-----------|-----|
| `type` | `email`, `number`, `url`, `tel` — validação automática |
| `minlength` / `maxlength` | Tamanho mínimo/máximo de texto |
| `min` / `max` | Valor mínimo/máximo numérico |
| `step` | Granularidade numérica |
| `pattern` | Regex de validação |

**Custom validity (JS):**
```js
input.addEventListener("change", () => {
  if (input.value.length < 3) {
    input.setCustomValidity("Mínimo 3 caracteres");
  }
});
```

**⚠️ Client-side é para UX apenas.** Atacantes burlam o frontend. Server-side validation é obrigatório.

## 4. Server-Side Validation (Segurança)

- Usar validators do framework (Django validators, Express validator, etc.)
- JSON input → [JSON Schema](https://json-schema.org/) + [OpenAPI](https://swagger.io/)
- Database → schema constraints

**Sinais de ataque:** valores que não poderiam vir do frontend (ex: opção de `<select>` que não existe no HTML).

## 5. File Uploads — Riscos e Defesas

| Risco | Defesa |
|-------|--------|
| Execução de arquivo malicioso | Apenas authenticated users |
| DoS por tamanho | Restringir tamanho máximo |
| Conteúdo indesejado/ilegal | Sistema de report + remoção |
| Overwrite de arquivos do site | Armazenar fora do webroot |
| XSS via download | Não servir HTML/JS de user uploads |

**Boas práticas:**
- Apenas usuários autenticados fazem upload
- Gerar nome próprio para o arquivo (não confiar no filename do usuário)
- Allowlist de extensões
- Restringir tamanho
- Armazenar em host diferente ou fora do webroot

## 6. Relação com Ataques Específicos

Input validation genérico é **primeira linha de defesa**, mas **não é defesa completa**.

| Ataque | Defesa Primária |
|--------|----------------|
| **XSS** | Output encoding + CSP + Trusted Types |
| **SQL injection** | Prepared statements / parameterized queries |
| **Command injection** | Evitar `exec()` / `shell_exec()` com input do usuário |

Ver:
- OWASP [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- OWASP [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- OWASP [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
