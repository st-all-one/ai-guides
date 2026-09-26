# Convenções de Capitalização de Títulos

## Visão Geral

A capitalização de títulos de seção na documentação MDN segue o padrão **sentence case** (primeira palavra maiúscula, resto minúsculo), mas inconsistências existem no repositório. Este documento estabelece a convenção e documenta exceções.

## Padrão Oficial

**Sentence case**: Apenas a primeira palavra e nomes próprios são capitalizados.

### Títulos de Seção Padrão

| Correto (sentence case) | Incorreto (title case) |
|-------------------------|----------------------|
| Concepts and usage | Concepts and Usage |
| Security requirements | Security Requirements |
| Interfaces | Interfaces (ok) |
| Examples | Examples (ok — palavra única) |
| Specifications | Specifications (ok) |
| Browser compatibility | Browser Compatibility |
| See also | See Also |
| Properties | Properties (ok) |
| Methods | Methods (ok) |
| Events | Events (ok) |
| Instance properties | Instance Properties |
| Instance methods | Instance Methods |
| Static methods | Static Methods |
| Data flow | Data Flow |
| Error handling | Error Handling |
| Performance considerations | Performance Considerations |

### Exceções

Nomes próprios e acrônimos mantêm capitalização original:

| Seção | Justificativa |
|-------|---------------|
| Using the Web Audio API | "Web Audio API" é nome próprio |
| Using the Gamepad API | "Gamepad API" é nome próprio |
| Web Audio concepts and usage | "Web Audio" é nome próprio |
| CSP (Content Security Policy) guidelines | "CSP" e "Content Security Policy" são nomes próprios |
| HTTPS requirements | "HTTPS" é acrônimo |
| Permissions-Policy | Nome de header HTTP |
| WebGL extension usage | "WebGL" é nome próprio |

## Padrão Observado no Repositório

### Maioria das APIs (correto — sentence case)

```
Concepts and usage
```

Usado em: `fetch_api/`, `webcodecs_api/`, `web_audio_api/`, `streams_api/`, `mediastream_recording_api/`, etc.

### APIs com title case (incorreto — não seguir)

```
Concepts and Usage
```

Usado em: `background_fetch_api/`, `badging_api/`, `cookie_store_api/`, `contact_picker_api/`, `user_preferences_api/`

### APIs com singular (inconsistente)

```
Concept
```

Usado em: `editcontext_api/`, `eyedropper_api/`, `virtualkeyboard_api/`

### APIs com prefixo (inconsistente)

```
Web Audio concepts and usage
Contact Picker API Concepts and Usage
```

Usado em: `web_audio_api/`, `contact_picker_api/`

## Regras

1. **Sempre sentence case**: `Concepts and usage`, não `Concepts and Usage`
2. **Sempre plural**: `Concepts and usage`, não `Concept and usage` (exceto quando o conceito é único e singular fizer mais sentido)
3. **Nomes próprios dentro do título**: Preservar capitalização original (ex: `Using the Web Audio API`, `WebGL error handling`)
4. **Acrônimos**: Manter maiúsculas (ex: `CSP requirements`, `HTTPS setup`)
5. **Preposições e artigos**: Minúsculos no meio do título (ex: `Guide to using`, `Overview of`)

## Tabela de Correção

| Título Incorreto | Título Correto |
|-----------------|----------------|
| Concepts and Usage | Concepts and usage |
| Contact Picker API Concepts and Usage | Concepts and usage |
| Concept | Concepts and usage |
| Data Flow | Data flow |
| Error Handling | Error handling |
| Browser Compatibility | Browser compatibility |
| Security Requirements | Security requirements |
| Performance Considerations | Performance considerations |
| See Also | See also |

## Boas Práticas

- **Verificar capitalização** antes de criar nova seção
- **Consistência entre páginas da mesma API**: Todas as páginas de uma API devem usar a mesma capitalização
- **Guias vs overviews**: Guias podem ter títulos mais descritivos (`Using the Web Audio API`) enquanto overviews usam seções padrão (`Concepts and usage`)
- **Nomes de API em títulos**: Preservar capitalização oficial do nome da API (ex: `WebCodecs API`, `Web Audio API`, `CSS Typed OM`)
