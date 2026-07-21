# HTTPS by Default — Feature de Privacidade do Navegador

## 1. Contexto

Browsers estão progressivamente **exigindo HTTPS** como padrão. Não é mais opcional — HTTPS é pré-requisito para a web moderna.

**Por que HTTPS é uma feature de privacidade:**
TLS criptografa dados em trânsito, impedindo que terceiros interceptem e usem dados para tracking. Sem HTTPS, qualquer pessoa na rede pode ver quais páginas um usuário visita e manipular o conteúdo.

## 2. Features do Browser que Reforçam HTTPS

### HTTPS-Only Mode
Navegadores como Firefox possuem **HTTPS-Only Mode**: todas as conexões HTTP são automaticamente upgrade para HTTPS antes de serem feitas.

### HSTS Preload List
Lista de sites que browsers **nunca** acessam via HTTP, mesmo na primeira conexão. Submeter em [hstspreload.org](https://hstspreload.org/).

### Mixed Content Blocking
Browsers bloqueiam (ou fazem upgrade) de subrecursos HTTP carregados em páginas HTTPS:
- **Blockable:** scripts, iframes, stylesheets, fetch/XHR — bloqueados
- **Upgradable:** imagens, áudio, vídeo — automaticamente upgrade para HTTPS

## 3. Tecnologias Relacionadas

| Tecnologia | Função |
|-----------|--------|
| **Certificate Transparency** | Log público de certificados; detecta certificados maliciosos |
| **HSTS** | Força navegador a sempre usar HTTPS para o domínio |
| **HTTP/2** | Embora não obrigue criptografia, browsers só implementam sobre HTTPS |

## 4. Impacto em APIs e Features

### Secure Contexts
APIs "poderosas" só funcionam em **Secure Contexts** (HTTPS ou `localhost`):

**67+ APIs restritas a Secure Contexts:**
Service Workers, Web Crypto, Geolocation, Notifications, WebAuthn, Web Bluetooth, WebUSB, WebHID, Web NFC, WebTransport, WebGPU, Payment Request, Credential Management, Push API, Screen Capture, File System, Generic Sensor, Async Clipboard, etc.

### Anti-Tracking Features
HTTPS é base para várias anti-tracking technologies:

| Feature | Relação com HTTPS |
|---------|------------------|
| `SameSite=Lax` (default) | Cross-site tracking prevenido |
| Third-party cookie blocking | Reduz tracking cross-site |
| Tracking parameter stripping | Browsers (Firefox, Safari, Brave) removem params de tracking de URLs |
| Redirect tracking protection | Mitiga bounce tracking |

## 5. O Que Desenvolvedores Precisam Fazer

- [ ] HTTPS habilitado e funcional (Let's Encrypt, ZeroSSL)
- [ ] HTTP → HTTPS redirect (301, mesmo host)
- [ ] HSTS: `max-age=63072000; includeSubDomains; preload`
- [ ] Submeter ao [HSTS preload list](https://hstspreload.org/)
- [ ] Testar sem HTTPS: site deve quebrar (Service Workers, APIs poderosas)
- [ ] Auditar mixed content (nenhum subrecurso HTTP)

## Ref

- MDN: [Certificate Transparency](/en-US/docs/Web/Security/Defenses/Certificate_Transparency)
- MDN: [Secure Contexts](/en-US/docs/Web/Security/Defenses/Secure_Contexts)
- MDN: [Mixed Content](/en-US/docs/Web/Security/Defenses/Mixed_content)
- MDN: [Strict-Transport-Security](/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
