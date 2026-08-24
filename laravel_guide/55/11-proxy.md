# Proxy no Laravel 5.5.50

Este dossiê cobre, com o máximo de detalhe possível, o comportamento de aplicações
Laravel 5.5.50 (LTS) quando executadas **atrás de um load balancer ou proxy reverso**
(ELB/ALB da AWS, Cloudflare, Nginx, HAProxy, Varnish, etc.) e como o framework — a
partir do 5.5 — resolve o problema de detecção de IP do cliente, do esquema HTTP/HTTPS
e da geração correta de URLs seguras através do middleware de Trusted Proxies.

> **REGRA DE VERSÃO**: Todo o conteúdo abaixo restringe-se ao Laravel 5.5.50 e ao
> pacote `fideloper/proxy` (Trusted Proxies) que **passou a acompanhar o Laravel por
> padrão a partir do 5.5**. Não são abordados recursos de versões posteriores (ex.: o
> arquivo de configuração `config/trustedproxy.php` dedicado introduzido mais tarde,
> a renomeação das constantes `HEADER_CLIENT_*` ou a mudança para `TrustHosts`).

---

## 1. O Problema: estar atrás de um proxy reverso

Quando uma aplicação Laravel roda atrás de um load balancer ou proxy reverso que
termina o TLS/SSL (faz o offload de HTTPS), a conexão TCP que de fato chega ao
servidor web (Nginx/FPM) vem **do próprio proxy**, e não do navegador do usuário.
Isso produz os seguintes efeitos colaterais:

1. **`$_SERVER['REMOTE_ADDR']` aponta para o proxy.** O endereço IP real do cliente
   fica "escondido" atrás do IP do balanceador. Consequentemente, `$request->ip()`
   (que por padrão lê `REMOTE_ADDR`) retorna o IP do load balancer, e não do usuário.
   Isso quebra logs, rate limiting, geolocalização, bloqueio de IP, auditoria, etc.

2. **O esquema (http vs https) é perdido.** O proxy costuma encaminhar o tráfego
   internamente na porta 80 (HTTP) para a aplicação. A aplicação "acha" que está
   servindo HTTP puro e, portanto:
   - `URL::secure()` / `secure_url()` geram links `http://...` (ou não geram links
     seguros corretamente).
   - Redirecionamentos (ex.: `Redirect::secure()`, middleware `RequireHTTPS`,
     `forceSchema`/`forceScheme`) apontam para HTTP em vez de HTTPS.
   - `asset()` e `secure_asset()` produzem URLs com esquema errado.
   - O `isSecure()` / detecção de HTTPS do `Illuminate\Http\Request` retorna `false`.

3. **O host original e a porta originais podem ser perdidos.** Se o proxy altera o
   `Host` ou termina em porta diferente da porta pública, geração de URLs absolutas,
   redirects e cookies (domínio/porta) podem ficar inconsistentes.

4. **O IP do cliente "real" e o IP do proxy são transportados via headers
   `X-Forwarded-*`** (ou via o cabeçalho padrão `Forwarded` do RFC 7239). Como esses
   headers são **enviados pelo cliente HTTP** também, eles são completamente
   falsificáveis — a menos que a aplicação saiba *exatamente quais hops* ela confia.
   Daí a necessidade de "proxies confiáveis".

Resumo do fluxo problemático:

```
Navegador (IP 200.1.2.3, HTTPS)
   │  TLS terminado no proxy
   ▼
Proxy / Load Balancer (IP 10.0.0.5)
   │  X-Forwarded-For: 200.1.2.3
   │  X-Forwarded-Proto: https
   │  X-Forwarded-Host: exemplo.com
   │  X-Forwarded-Port: 443
   │  HTTP na porta 80 ──► REMOTE_ADDR = 10.0.0.5
   ▼
Laravel / PHP-FPM
   REMOTE_ADDR = 10.0.0.5   (errado: é o proxy)
   Sem Trusted Proxies: lê REMOTE_ADDR como o "cliente" e acha que é HTTP.
```

---

## 2. Trusted Proxies no 5.5: a feature que passou a vir por padrão

### 2.1 Confirmação de versão (base documental)

- `releases.md` (seção **Trusted Proxy Integration**): *"When running applications
  behind a load balancer that terminates TLS / SSL certificates, you may notice your
  application sometimes does not generate HTTPS links. [...] many Laravel users install
  the Trusted Proxies package by Chris Fidao. Since this is such a common use case,
  Chris' package now ships with Laravel 5.5 by default."*

- `releases.md` (seção Laravel 5.5, changelog de melhorias): lista *"convenient Blade
  shortcuts, **improved trusted proxy support**, and more"*.

- `requests.md` (seção **Configuring Trusted Proxies**): documenta o uso do middleware
  `App\Http\Middleware\TrustProxies` incluído na aplicação padrão.

Portanto: **no Laravel 5.5, o pacote `fideloper/proxy` (Trusted Proxies) já vem
instalado e configurado por padrão** (via `composer.json` da aplicação skeleton e
registro do middleware). Em versões anteriores era necessário instalá-lo manualmente.

### 2.2 O middleware `App\Http\Middleware\TrustProxies`

A aplicação padrão do 5.5 inclui, em `app/Http/Middleware/TrustProxies.php`, uma
classe que **estende** `Fideloper\Proxy\TrustProxies` (do pacote). O conteúdo
"esqueleto" documentado em `requests.md` e `releases.md` é:

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Fideloper\Proxy\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    /**
     * The trusted proxies for this application.
     *
     * @var array
     */
    protected $proxies;

    /**
     * The current proxy header mappings.
     *
     * @var array
     */
    protected $headers = [
        Request::HEADER_FORWARDED => 'FORWARDED',
        Request::HEADER_X_FORWARDED_FOR => 'X_FORWARDED_FOR',
        Request::HEADER_X_FORWARDED_HOST => 'X_FORWARDED_HOST',
        Request::HEADER_X_FORWARDED_PORT => 'X_FORWARDED_PORT',
        Request::HEADER_X_FORWARDED_PROTO => 'X_FORWARDED_PROTO',
    ];
}
```

> Observação: o exemplo em `requests.md` já vem com `$proxies` pré-preenchido como
> array de IPs; o exemplo em `releases.md` vem com `$proxies` vazio (`null`) e
> `$headers` idêntico. Ambos ilustram a mesma estrutura.

A classe base `Fideloper\Proxy\TrustProxies` implementa o contrato de middleware do
Laravel (método `handle($request, $next)`). Em runtime, ela:

1. Lê as propriedades `$proxies` e `$headers` da subclasse.
2. Chama internamente o método do Symfony `Request::setTrustedProxies(...)` (ver seção 7).
3. Deixa a requisição seguir (`return $next($request);`).

### 2.3 Propriedade `$proxies`

Define **quais endereços IP / faixas CIDR são considerados proxies confiáveis**.
Apenas para esses IPs o framework aceita/acredita nos headers `X-Forwarded-*`.

- **Array de IPs ou CIDR:**
  ```php
  protected $proxies = [
      '192.168.1.1',
      '192.168.1.2',
      '10.0.0.0/8',
  ];
  ```
- **Confiar em todos os proxies (string `'**'`):** documentado em `requests.md`:
  ```php
  protected $proxies = '**';
  ```
  Isso é útil quando se usa AWS/cloud load balancer e **não se conhece** os IPs reais
  dos balanceadores. **Cuidado**: ver caveats de segurança na seção 6.

> Nota de implementação: internamente o pacote converte a string `'**'` para
> "trust all" ao passar para o Symfony. Em Symfony/`Illuminate\Http\Request`, passar
> a string literal `'*'` como proxy é interpretado como um único IP/range (não como
> "todos"), por isso o pacote utiliza `'**'` para semântica de "confiar em todos".
> Esse é um ponto sutil e fonte de confusão — usar `'*'` (um asterisco) NÃO confia em
> todos e pode mascarar o problema.

### 2.4 Propriedade `$headers` (mapeamento de headers)

Mapeia as **constantes de bitmask do Symfony** (`Illuminate\Http\Request` estende
`Symfony\Component\HttpFoundation\Request`) para os **nomes reais dos cabeçalhos**
enviados pelo seu proxy. As constantes disponíveis no 5.5 (vindas do Symfony 3.x):

| Constante (`Request::`)            | Bit | Cabeçalho padrão                 |
|------------------------------------|-----|----------------------------------|
| `HEADER_FORWARDED`                 | 0   | `Forwarded` (RFC 7239)           |
| `HEADER_X_FORWARDED_FOR`           | 1   | `X-Forwarded-For`                |
| `HEADER_X_FORWARDED_HOST`          | 2   | `X-Forwarded-Host`               |
| `HEADER_X_FORWARDED_PROTO`         | 4   | `X-Forwarded-Proto`              |
| `HEADER_X_FORWARDED_PORT`          | 8   | `X-Forwarded-Port`               |

O mapeamento padrão no 5.5 (5 entradas) é exatamente o array mostrado acima em 2.2.
Cada valor do array (`'FORWARDED'`, `'X_FORWARDED_FOR'`, etc.) é o nome do cabeçalho
HTTP que o proxy envia (o Symfony faz o parse do nome e da variante `X-Forwarded-*`).

> Nota de versão: a constante `HEADER_X_FORWARDED_PREFIX` (bit 16, para
> `X-Forwarded-Prefix`) **não aparece no esqueleto do 5.5** documentado e não deve ser
> presumida como suportada nesta versão específica — mantenha-se no conjunto de 5
> cabeçalhos documentados. Não inclua recursos de versões posteriores.

Há também a combinação conveniente `Request::HEADER_X_FORWARDED_ALL` (bitmask que
reúne todos os `X-Forwarded-*`), porém o esqueleto padrão do 5.5 lista os itens
individualmente. Você pode usar o atalho:

```php
protected $headers = Request::HEADER_X_FORWARDED_ALL;
```

quando quiser confiar em todos os cabeçalhos `X-Forwarded-*` de uma vez (sem o
cabeçalho `Forwarded` RFC 7239).

### 2.5 Registro do middleware

Para que o Trusted Proxies tenha efeito, ele deve estar na pilha de middleware
**global** (pois precisa rodar *antes* de qualquer outra lógica que leia IP/esquema).
Na aplicação padrão do 5.5, `app/Http/Kernel.php` já lista:

```php
protected $middleware = [
    \Illuminate\Foundation\Http\Middleware\CheckForMaintenanceMode::class,
    \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
    \App\Http\Middleware\TrimStrings::class,
    \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    \App\Http\Middleware\TrustProxies::class,   // <-- Trusted Proxies
];
```

A **ordem importa** (ver seção 8): `TrustProxies` deve ser executado cedo o suficiente
para que middlewares subsequentes (e a própria aplicação) já vejam o IP/esquema
corretos. Ele tipicamente vem posicionado depois de `CheckForMaintenanceMode` e antes
de qualquer middleware que dependa de `ip()`, `isSecure()`, `url()`, etc.

---

## 3. Configuração para cenários reais

### 3.1 AWS Elastic/Application Load Balancer (ELB/ALB)

A AWS não documenta um conjunto fixo e estável de IPs de balanceadores que você possa
listar com segurança em `$proxies` (eles mudam). Por isso o caso de uso clássico para
`$proxies = '**'` (confiar em todos). O ELB/ALB envia:

- `X-Forwarded-For` (IP do cliente, e IPs intermediários)
- `X-Forwarded-Proto` (`http` ou `https`)
- `X-Forwarded-Port` (porta original, ex.: 443)
- `X-Forwarded-Host` (host original, em alguns casos)

Configuração típica:

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Fideloper\Proxy\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    protected $proxies = '**';

    protected $headers = [
        Request::HEADER_FORWARDED         => 'FORWARDED',
        Request::HEADER_X_FORWARDED_FOR   => 'X_FORWARDED_FOR',
        Request::HEADER_X_FORWARDED_HOST  => 'X_FORWARDED_HOST',
        Request::HEADER_X_FORWARDED_PORT  => 'X_FORWARDED_PORT',
        Request::HEADER_X_FORWARDED_PROTO => 'X_FORWARDED_PROTO',
    ];
}
```

> **Ressalva de segurança no ELB**: usar `'**'` na AWS é geralmente aceitável *porque*
> o ELB é o único hop de rede que alcança sua instância (o Security Group bloqueia
> tráfego direto de fora). Ou seja, a confiança em "todos os proxies" só é segura se
> **ninguém além do load balancer puder enviar tráfego TCP direto** à sua app. Se a
> instância aceitar conexões diretas da internet, `'**'` vira vetor de spoofing (seção 6).

### 3.2 Cloudflare

A Cloudflare **publica faixas CIDR estáveis** (IPv4 e IPv6) em
`https://www.cloudflare.com/ips/`. A abordagem recomendada (mais segura que `'**'`) é
listar essas faixas em `$proxies`:

```php
protected $proxies = [
    // IPv4 da Cloudflare (exemplo de faixas — confira a lista oficial atual)
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/12',
    '172.64.0.0/13',
    '131.0.72.0/22',
    // IPv6 da Cloudflare (exemplo)
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32',
];

protected $headers = Request::HEADER_X_FORWARDED_ALL;
```

A Cloudflare envia `X-Forwarded-For` (com o IP real do visitante como primeiro valor)
e `X-Forwarded-Proto` (`https` quando a conexão com o visitante é HTTPS). Com os
proxies corretamente listados, `$request->ip()` retornará o IP real do visitante.

> Lembrar: a lista de IPs da Cloudflare **muda**. Em produção robusta, automatize a
> atualização desse array (ex.: gerar a configuração em deploy) em vez de fixá-lo para
> sempre.

### 3.3 Nginx como proxy reverso (mesma rede / mesmo host)

Quando você tem um Nginx à frente do PHP-FPM (ou Nginx → Nginx), você *conhece* o IP
do proxy (geralmente `127.0.0.1` ou o IP privado do host). Liste-o explicitamente:

```php
protected $proxies = [
    '127.0.0.1',
    // se o Nginx estiver em outro container/host:
    // '10.0.0.10',
];

protected $headers = [
    Request::HEADER_X_FORWARDED_FOR   => 'X_FORWARDED_FOR',
    Request::HEADER_X_FORWARDED_HOST  => 'X_FORWARDED_HOST',
    Request::HEADER_X_FORWARDED_PROTO => 'X_FORWARDED_PROTO',
    Request::HEADER_X_FORWARDED_PORT  => 'X_FORWARDED_PORT',
];
```

E no Nginx, os headers devem ser definidos de forma consistente:

```nginx
location ~ \.php$ {
    fastcgi_pass 127.0.0.1:9000;
    # ...
    fastcgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;
    fastcgi_param HTTP_X_FORWARDED_PROTO $scheme;
    fastcgi_param HTTP_X_FORWARDED_HOST $host;
    fastcgi_param HTTP_X_FORWARDED_PORT $server_port;
}
```

Ou, se usar `proxy_pass`:

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;
```

Os nomes `X_FORWARDED_FOR` etc. no array `$headers` do middleware correspondem aos
cabeçalhos `X-Forwarded-For` enviados — o Symfony normaliza o nome.

---

## 4. Comportamento resultante após configurar Trusted Proxies

Uma vez que `Request::setTrustedProxies()` foi chamado (pelo middleware), o
`Illuminate\Http\Request` (que estende o Symfony Request) passa a:

- **`$request->ip()`** — retorna o **IP real do cliente** lido de `X-Forwarded-For`
  (ou do cabeçalho `Forwarded`), não mais o `REMOTE_ADDR` do proxy.
- **`$request->ips()`** — retorna o array de IPs encaminhados (cliente + proxies
  intermediários, na ordem).
- **`$request->isSecure()` / detecção de HTTPS** — lê `X-Forwarded-Proto` e passa a
  retornar `true` quando o cliente original usou HTTPS.
- **`$request->getHost()` / `getPort()`** — utilizam `X-Forwarded-Host` e
  `X-Forwarded-Port` quando presentes e o proxy é confiável, reconstruindo o host/porta
  públicos corretos.
- **Geração de URLs** — `url()`, `route()`, `asset()`, `secure_url()`/`URL::secure()`,
  `redirect()->secure()` passam a produzir `https://` corretamente quando o cliente
  usou HTTPS, e com o host/porta públicos.
- **Redirecionamentos** — middleware de force HTTPS / `Redirect::secure` geram
  redirects para a URL segura correta.
- **Cookies e sessão** — o `host`/`secure` dos cookies reflete o contexto público.

Exemplo prático:

```php
$request->ip();        // "200.1.2.3"  (cliente real, vindo do X-Forwarded-For)
$request->isSecure();  // true          (porque X-Forwarded-Proto: https)
url()->secure('foo'); // "https://exemplo.com/foo"
```

Sem o Trusted Proxies, os mesmos retornariam `10.0.0.5` (proxy), `false`, e
`http://...` respectivamente.

---

## 5. HTTPS behind proxy, HSTS e esquema de URL

### 5.1 O problema de "não gerar HTTPS links"

Como destacado em `requests.md` e `releases.md`: *"your application is being forwarded
traffic from your load balancer on port 80 and does not know it should generate secure
links."* A solução **é** o Trusted Proxies — ele faz o `X-Forwarded-Proto` ser levado
em conta na detecção de esquema.

### 5.2 Forçar HTTPS em toda a aplicação

Mesmo com Trusted Proxies, você pode querer forçar HTTPS. No 5.5 isso é feito via:

- Middleware customizado chamando `$request->secure()` / `redirect()->secure()`, ou
- No Nginx: redirecionar HTTP→HTTPS antes de chegar ao PHP (recomendado, evita
  processar a requisição na app só para redirecionar).

Como o Trusted Proxies corrige `isSecure()`, um middleware que verifica
`!$request->secure()` passará a funcionar corretamente atrás do proxy.

### 5.3 HSTS (HTTP Strict Transport Security)

O HSTS **não** é configurado pelo pacote Trusted Proxies — é responsabilidade da
aplicação/proxy. No 5.5 você adicionaria o header manualmente, ex. num middleware ou
no Nginx:

```php
// Exemplo de middleware (não fornecido pelo pacote; ilustrativo)
$response->headers->set('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains');
```

Importante: o HSTS só faz sentido quando o esquema detectado está correto, o que
depende do Trusted Proxies estar bem configurado. Se `isSecure()` mentir (falso
positivo/negativo por falta de proxy confiável), lógicas de segurança baseadas nele
ficam comprometidas.

### 5.4 Esquema de URL e `asset()` vs `secure_asset()`

Com Trusted Proxies correto, `asset()` gera `https://` automaticamente quando a
requisição original foi HTTPS (pois o helper consulta o esquema da request). Use
`secure_asset()` quando quiser forçar HTTPS independentemente. Lembre-se de que isso
tudo depende do `X-Forwarded-Proto` ser lido de um proxy confiável.

---

## 6. Segurança: NUNCA confiar cegamente sem restrição

O ponto mais crítico de todo este dossiê:

> **Confiar em todos os proxies (`'**'`) expõe a aplicação a spoofing de IP e de
> esquema** se qualquer cliente puder enviar tráfego TCP direto à aplicação (bypass do
> load balancer).

Por quê: os cabeçalhos `X-Forwarded-*` são **cabeçalhos HTTP normais**, que qualquer
cliente pode enviar. Se a app aceita conexões diretas da internet e confia em `'**'`,
um atacante pode enviar `X-Forwarded-For: 127.0.0.1` ou `X-Forwarded-Proto: https` e
enganar a aplicação — falsificando o IP do cliente (contornando bloqueios/rate limit),
falsificando o esquema (enganando verificações de `isSecure()` que protegem áreas
sensíveis) e o host.

Regras de segurança no 5.5:

1. **Liste apenas proxies que você controla / conhece** (`$proxies` com IPs/CIDR).
2. Use `'**'` **somente** quando houver um controle de rede (Security Group, firewall,
   bind do web server) que impeça conexões diretas à app, restando só o load balancer
   como origem (cenário típico AWS atrás de ELB, com SG restrito).
3. **Nunca** exponha a aplicação diretamente à internet com `$proxies = '**'`.
4. Mantenha a lista de IPs de proxies (ex.: Cloudflare) atualizada.
5. Lembre-se de que confiar no proxy errado também "vaza" a confiança para qualquer
   header `X-Forwarded-*` que o proxy *não* sobrescreve — o proxy reverso deve
   **limpar/sobrescrever** esses headers na entrada (ex.: o Nginx deve definir
   `X-Forwarded-For $proxy_add_x_forwarded_for` e ignorar o valor vindo do cliente).

---

## 7. `setTrustedProxies()`: o mecanismo do Symfony usado internamente

O pacote `fideloper/proxy` é, essencialmente, um wrapper fino sobre o mecanismo de
proxies confiáveis do Symfony HttpFoundation. O método relevante é:

```php
// Symfony\Component\HttpFoundation\Request
public static function setTrustedProxies(array $proxies, int $trustedHeaderSet)
```

- **`$proxies`**: lista de IPs/CIDRs confiáveis. O Symfony valida e armazena em
  `Request::$trustedProxies`. Quando vazio/nulo, nenhum proxy é confiado.
- **`$trustedHeaderSet`**: bitmask informando *quais* cabeçalhos encaminhados devem ser
  aceitos (combinação das constantes `HEADER_*`). É exatamente o que a propriedade
  `$headers` do middleware fornece.

O que o Symfony faz internamente ao processar a requisição, quando há proxies
confiáveis:

- Ele compara o `REMOTE_ADDR` contra a lista de proxies confiáveis.
- **Somente se** `REMOTE_ADDR` for um proxy confiável, ele lê os cabeçalhos
  `X-Forwarded-*` (conforme o bitmask) para determinar IP do cliente, esquema, host e
  porta.
- Caso contrário, ignora esses headers (tratando-os como não confiáveis).

É por isso que o `TrustProxies` do Laravel **deve** rodar cedo (no middleware global)
e por isso que listar corretamente `$proxies` é a chave de tudo. O método é estático e
"global" no Symfony — afeta todas as instâncias de `Request` na requisição.

O `TrustProxies::handle()` da classe base, em linhas gerais (comportamento do pacote
fideloper/proxy v4 usado no 5.5):

```php
public function handle($request, Closure $next)
{
    $request->setTrustedProxies(
        $this->proxies ?: [],            // IPs/CIDR (ou '**' tratado como todos)
        $this->headers                   // bitmask dos cabeçalhos confiáveis
    );

    return $next($request);
}
```

> Detalhe de versão: no 5.5 o pacote converte a string `'**'` para indicar "trust all
> proxies" antes de chamar `setTrustedProxies`. A string `'*'` (um asterisco) **não**
> tem esse significado no Symfony e seria tratada como um IP/range literal — não use
> `'*'`, use `'**'` se quiser confiar em todos (conforme documentado em `requests.md`).

---

## 8. Armadilhas (gotchas) e notas de 5.5.50

1. **Confiar em `'*'` (um asterisco) em vez de `'**'`.** O doc do 5.5 diz `**`. Usar
   `'*'` não confia em todos e silencia o problema de forma enganosa.
2. **Middleware na ordem errada.** `TrustProxies` precisa rodar antes de qualquer
   código que leia `ip()`, `isSecure()`, `url()`, etc. Mantenha-o no `$middleware`
   global, cedo na pilha.
3. **Proxy que NÃO sobrescreve `X-Forwarded-*`** — um cliente malicioso pode injetar
   esses headers antes de chegar ao proxy. O proxy reverso deve sobrescrevê-los.
4. **Listar proxy errado / esquecer de listar** → a app continua vendo o IP do proxy e
   esquema HTTP. Sintoma clássico: "meus links saem como http mesmo atrás de HTTPS".
5. **Cabeçalho errado no `$headers`.** Se o seu proxy envia `X-Forwarded-Proto` mas
   você mapeou apenas `HEADER_FORWARDED`, o esquema não será detectado. Use
   `Request::HEADER_X_FORWARDED_ALL` para cobrir os `X-Forwarded-*` comuns.
6. **`'**'` exposto publicamente.** Se a instância aceita conexões diretas, `'**'` =
   spoofing livre (seção 6).
7. **Mudança de IPs do Cloudflare/AWS.** Listas fixas ficam obsoletas; automatize.
8. **`config:cache`** (ver `configuration.md`): após alterar `TrustProxies`, se você
   faz cache de config em produção, re-rode `php artisan config:cache`. O middleware
   em si não lê `config()`, mas alterações em código de middleware exigem
   re-deploy/clear de opcode cache conforme seu setup.
9. **Não confundir com facades.** O termo "proxy" também aparece em `facades.md`
   ("facades serve as a proxy to accessing the underlying implementation"), mas isso é
   um padrão de design (proxy de objeto resolvido do container), **sem relação** com
   load balancer / Trusted Proxies. Não misture os dois conceitos.
10. **`HEADER_X_FORWARDED_PREFIX`** não faz parte do esqueleto documentado do 5.5; não
    presuma suporte nesta versão específica.

---

## 9. Outros pontos de "proxy" na documentação do 5.5

- **Facades (`facades.md`)**: usa "proxy" no sentido de *proxy de objeto* (as facades
  fazem proxy das chamadas para a instância resolvida do container). Irrelevante para
  load balancer, mas frequentemente causa confusão de busca.
- **Homestead (`homestead.md`)**: o Homestead suporta um *site type* chamado **`proxy`**
  dentre os tipos disponíveis (`apache`, `laravel` (default), `proxy`, `silverstripe`,
  `statamic`, `symfony2`, `symfony4`). Trata-se de uma configuração do Nginx no box
  Vagrant para fazer proxy reverso de um site para outro — útil para encaminhar
  requisições a uma aplicação que roda em outra porta/serviço dentro do Homestead. É
  mencionado aqui apenas para contextualizar: esse "proxy" do Homestead é about
  roteamento de desenvolvimento local, e não o mecanismo de Trusted Proxies da
  aplicação. Exemplo de uso (fora do escopo do Trusted Proxies):
  ```yaml
  sites:
      - map: api.exemplo.test
        to: 127.0.0.1:3000
        type: proxy
  ```
- **Mix (`mix.md`)**: o `proxy` do BrowserSync (`proxy: 'meu-dominio.test'`) é
  exclusivamente uma funcionalidade de dev tooling (hot reload), sem relação com
  Trusted Proxies.

---

## Resumo de Pontos-Chave

- A partir do **Laravel 5.5**, o pacote **`fideloper/proxy` (Trusted Proxies) já vem
  por padrão** — confirmado em `releases.md` (Trusted Proxy Integration) e `requests.md`
  (Configuring Trusted Proxies).
- Aplicações atrás de load balancer/proxy reverso perdem o IP real do cliente
  (`REMOTE_ADDR` vira o proxy) e o esquema HTTPS (tráfego interno na porta 80),
  quebrando `ip()`, `isSecure()`, geração de URLs seguras e redirects.
- O middleware **`App\Http\Middleware\TrustProxies`** (estende
  `Fideloper\Proxy\TrustProxies`) usa:
  - `$proxies`: array de IPs/CIDR, ou `'**'` para confiar em todos (doc `requests.md`).
  - `$headers`: mapeamento das constantes `Request::HEADER_*` para os cabeçalhos
    `X-Forwarded-*` / `Forwarded`.
- Deve estar no **middleware global** e rodar cedo na pilha.
- O pacote chama `Symfony Request::setTrustedProxies()`; só proxies confiáveis têm seus
  `X-Forwarded-*` aceitos.
- **Segurança**: nunca use `'**'` se a app aceita conexões diretas; liste apenas
  proxies conhecidos (ex.: faixas da Cloudflare) ou restrinja por rede (SG AWS).
- AWS ELB/ALB: caso clássico de `'**'` (com SG restrito). Cloudflare: liste as faixas
  CIDR oficiais. Nginx: liste `127.0.0.1` e defina os headers no `proxy_pass`/`fastcgi`.
- Não confunda com "proxy" de facades, site type `proxy` do Homestead, ou `proxy` do
  BrowserSync/Mix — são conceitos distintos.
- Não presuma recursos de versões posteriores (config dedicado, `TrustHosts`,
  `HEADER_X_FORWARDED_PREFIX`).

---

## Referências

- `TMP/laravel5.5/requests.md` — seção **Configuring Trusted Proxies** (problema de
  HTTPS links, middleware `TrustProxies`, exemplo de `$proxies`/`$headers`, "Trusting
  All Proxies" com `'**'`).
- `TMP/laravel5.5/releases.md` — seção **Trusted Proxy Integration** (o pacote
  `fideloper/TrustedProxy` passa a shipar por padrão no 5.5) e changelog "improved
  trusted proxy support".
- `TMP/laravel5.5/middleware.md` — registro de middleware global (`$middleware` em
  `app/Http/Kernel.php`), ordem de execução, grupos `web`/`api`.
- `TMP/laravel5.5/configuration.md` — caching de configuração (`config:cache`) e
  ambiente, relevantes ao deploy das configurações de proxy.
- `TMP/laravel5.5/homestead.md` — site type `proxy` (menção contextual, desenvolvimento
  local, sem relação com Trusted Proxies).
- `TMP/laravel5.5/facades.md` — uso de "proxy" como padrão de facade (distinto de
  load balancer).
- Base de conhecimento estrita do **Laravel 5.5.50 LTS** e do pacote `fideloper/proxy`
  (versão empacotada no 5.5), sem recursos de versões posteriores.
