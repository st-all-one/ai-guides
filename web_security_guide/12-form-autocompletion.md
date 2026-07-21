# Form Autocompletion — Controle de Privacidade

## Autocomplete vs Autofill

| Termo | Comportamento |
|-------|--------------|
| **Autocompletion** | Sugere valores enquanto o usuário digita (baseado em entradas anteriores) |
| **Autofill** | Pré-preenche campos ao carregar a página (baseado em dados salvos) |

Ambos são ativados por padrão nos browsers. Podem ser um **risco de privacidade** para campos com dados sensíveis (OTP, CPF, CVV, identificador governamental).

## Desabilitando Autocompletion

### Form-level
```html
<form method="post" action="/form" autocomplete="off">
```

### Field-level
```html
<input type="text" id="cc" name="cc" autocomplete="off" />
```

### Efeitos de `autocomplete="off"`
1. Browser não salva o valor para autocompletion futuro
2. Browser não cacheia o valor no session history (back button não mostra dados)

### Contorno
Se o browser continua sugerindo mesmo com `autocomplete="off"`, mude o `name` do `<input>`.

## ⚠️ Exceção: Login Fields

Browsers modernos **ignoram** `autocomplete="off"` em campos de login (username/password) — por segurança, para incentivar uso de password managers.

| Cenário | Comportamento do Browser |
|---------|-------------------------|
| `autocomplete="off"` no `<form>` com login fields | Browser ainda oferece salvar senha |
| `autocomplete="off"` nos `<input>` username/password | Browser ainda oferece salvar senha |

### Para campos de "new password" (cadastro, troca de senha)
Use `autocomplete="new-password"` — o browser não autofill com senha existente:
```html
<input type="password" name="new-password" autocomplete="new-password" />
```

## WCAG 2.1 Success Criterion 1.3.5 (Identify Input Purpose)

- **Não exige** que autocomplete/autofill funcione
- **Exige** que campos de dados pessoais sejam programaticamente identificados via `autocomplete` attribute
- Pode-se usar `autocomplete` attributes mesmo com `autocomplete="off"` no form

## Regras

1. Use `autocomplete="off"` para OTP, CVV, identificadores governamentais
2. Use `autocomplete="new-password"` para campos de criação de senha
3. **Não tente** desabilitar autofill em login fields (browsers ignoram)
4. Sempre use `autocomplete` attributes semânticos para acessibilidade (WCAG)
