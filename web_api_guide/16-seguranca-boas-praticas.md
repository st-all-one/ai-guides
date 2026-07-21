# Segurança e Requisitos de Contexto Seguro

## Visão Geral

O tratamento de segurança na documentação de Web APIs segue uma abordagem baseada em **badges** no topo da página, não seções dedicadas. A seção "Security requirements" sugerida em templates anteriores não é usada no repositório real.

## Mecanismos de Documentação de Segurança

### 1. `{{securecontext_header}}` (recomendado)

Usado no topo de páginas que exigem **contexto seguro** (HTTPS ou `localhost`).

```markdown
---
title: 'Fetch API'
slug: Web/API/Fetch_API
page-type: web-api-overview
---
{{DefaultAPISidebar("Fetch API")}}{{securecontext_header}}
```

Renderiza um badge "Secure context" no topo da página.

**Onde usar**:
- Toda página de API que exige HTTPS
- Tanto overviews quanto páginas de interface/método/propriedade
- APIs que usam `Permissions-Policy` também precisam deste badge

### 2. `{{AvailableInWorkers}}` com contexto de worker

Indica disponibilidade em workers — complementa informações de segurança:

```markdown
{{securecontext_header}}{{DefaultAPISidebar("Cookie Store API")}}{{AvailableInWorkers("window_and_service")}}
```

### 3. Badges de Permissions-Policy no texto

APIs que exigem permissões específicas documentam no corpo:

```markdown
## Permissões

Para usar esta API, a política de permissões deve permitir:

- {{httpheader("Permissions-Policy/camera", "camera")}} (para captura de vídeo)
- {{httpheader("Permissions-Policy/microphone", "microphone")}} (para captura de áudio)
```

### 4. Notas de segurança inline

Para requisitos de segurança específicos de métodos/propriedades:

```markdown
> **Nota:** Esta API só está disponível em contextos seguros (HTTPS).
```

## Quando Usar Cada Mecanismo

| Requisito | Mecanismo | Exemplo |
|-----------|-----------|---------|
| API requer HTTPS | `{{securecontext_header}}` no topo | `api/media_capabilities_api/` |
| API requer permissão específica | Seção "Permissions" no corpo | `api/screen_capture_api/` |
| API tem restrição de CSP | Nota inline ou `{{HTTPMethod("...")}}` | `api/trusted_types_api/` |
| API requer user activation | Nota inline na descrição | `api/fullscreen_api/` |
| API disponível apenas em workers | `{{AvailableInWorkers}}` | `api/websockets_api/` |

## Anti-patterns

### ❌ Seção "Security requirements" dedicada

```markdown
## Security requirements

- HTTPS required
- Permissions-Policy: camera
```

**Problema**: Nenhuma API no repositório usa esta seção. A informação é fragmentada em badges, seções de permissão e notas inline.

### ✅ Alternativa correta

```markdown
---
title: 'Screen Capture API'
slug: Web/API/Screen_Capture_API
page-type: web-api-overview
status: [experimental]
---
{{DefaultAPISidebar("Screen Capture API")}}{{securecontext_header}}

## Permissões

Para usar a Screen Capture API, a política de permissões deve permitir `display-capture`:
```

### ❌ Badge de segurança ausente em API que requer HTTPS

APIs que exigem `securecontext_header` mas não o incluem levam usuários a tentar usar a API em HTTP.

### ✅ Badge presente

Sempre verificar se `{{securecontext_header}}` está presente em APIs que exigem HTTPS. Consultar `browser-compat` para confirmar o requisito.

### ❌ Duplicação de badge e seção

Usar `{{securecontext_header}}` + seção "Security requirements" manual — redundante e inconsistente com o padrão do repositório.

### ✅ Apenas badge

```markdown
{{DefaultAPISidebar("Screen Capture API")}}{{securecontext_header}}
```

Sem seção "Security requirements".

## Checklist de Segurança para Documentação

- [ ] API requer HTTPS? → Adicionar `{{securecontext_header}}`
- [ ] API requer `Permissions-Policy`? → Adicionar seção "Permissions" com `{{httpheader}}`
- [ ] API requer `user activation`? → Nota inline no método/propriedade relevante
- [ ] API requer CSP específica? → Nota inline ou seção "Content Security Policy"
- [ ] API disponível apenas em parte dos workers? → Adicionar `{{AvailableInWorkers}}` com parâmetro apropriado
- [ ] API é experimental e requer flags? → Menção inline ou `{{experimental_inline}}` nos métodos afetados
