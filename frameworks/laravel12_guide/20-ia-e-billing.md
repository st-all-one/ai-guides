# IA, Ferramentas de Agente e Billing — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **integrar**: Laravel AI SDK (agentes, imagens,
> áudio, embeddings), Boost/MCP para agentes de código, Laravel Prompts (CLI) e billing
> (Cashier Stripe/Paddle).

---

## 1. Laravel AI SDK (`laravel/ai`)

API unificada para OpenAI, Anthropic, Gemini, Azure, Groq, xAI, DeepSeek, Mistral, Ollama etc.

```bash
composer require laravel/ai
php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"
php artisan migrate       # cria agent_conversations / agent_conversation_messages
```

```ini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
COHERE_API_KEY=
# ...
```

### 1.1 Agentes

```bash
php artisan make:agent SalesCoach
php artisan make:agent SalesCoach --structured
```

```php
namespace App\Ai\Agents;

use Laravel\Ai\Contracts\{Agent, Conversational, HasTools, HasStructuredOutput};
use Laravel\Ai\Enums\Lab;

class SalesCoach implements Agent, Conversational, HasTools
{
    public function instructions(): string
    {
        return 'Você é um coach de vendas conciso.';
    }

    public function provider(): Lab { return Lab::OpenAI; }
    public function model(): string { return 'gpt-4o-mini'; }
    // tools(), messages(), schema() ...
}
```

```php
use App\Ai\Agents\SalesCoach;

$response = (new SalesCoach)->prompt('Resuma esta conversa de vendas...');
echo $response->text;
// ou: SalesCoach::make(user: $user)->prompt(...)
// conversas persistentes, tools, saída estruturada (--structured), stream() e ->usage
```

### 1.2 Outras capacidades

```php
// Imagens
use Laravel\Ai\Image;
$image = Image::of('um farol ao pôr do sol')->generate();

// Áudio (TTS) e transcrição (STT)
use Laravel\Ai\Audio; use Laravel\Ai\Transcription;
$audio = Audio::of('Olá!')->generate();
$text  = Transcription::fromPath('/x/audio.mp3')->generate();
//      Transcription::fromStorage('audio.mp3')

// Embeddings (para busca vetorial — ver 17-busca-e-eloquent-avancado.md)
use Laravel\Ai\Embeddings;
$response = Embeddings::for(['texto'])->generate();
$response->embeddings;

// Reranking
use Laravel\Ai\Reranking;
$ranked = Reranking::of(['doc a', 'doc b'])->rerank('consulta');
$ranked->first()->document; $ranked->first()->score;

// Files e Vector Stores (RAG)
use Laravel\Ai\Files\Document;
use Laravel\Ai\Stores;
$doc   = Document::fromPath('/x/doc.pdf')->put();
$store = Stores::create('Knowledge Base');
$store->add(Document::fromPath('/x/doc.pdf'));
```

- **Failover** entre provedores (config em `config/ai.php`).
- **Testes**: fake por componente — `SalesCoach::fake()`, `Image::fake()`, `Audio::fake()`,
  `Transcription::fake()`, `Embeddings::fake()`, `Reranking::fake()`, `Files::fake()` — e
  `->preventStrayPrompts()` para barrar chamadas não previstas.
- Use `Lab::OpenAI` etc. (enum) em vez de strings.

---

## 2. Boost + MCP (desenvolvimento com agentes de IA)

**Laravel Boost** conecta agentes (Claude Code, Cursor, Copilot, Codex, Gemini CLI, Junie…) à sua
aplicação via **MCP**.

```bash
composer require laravel/boost --dev
php artisan boost:install     # detecta IDE/agente e gera .mcp.json, CLAUDE.md, boost.json
php artisan boost:update      # atualiza guidelines/skills
php artisan boost:mcp         # inicia o servidor MCP manualmente
```

Registro manual (JSON):

```json
{
    "mcpServers": {
        "laravel-boost": { "command": "php", "args": ["artisan", "boost:mcp"] }
    }
}
```

Ferramentas MCP (agentes podem): info da app, conexões/esquema/query do banco, rotas, comandos
Artisan, logs, browser logs, tinker e **Search Docs** (docs versionadas por pacote).

- **AI Guidelines**: instruções por pacote/versão (Laravel 10/11/12, Livewire, Inertia, Tailwind,
  Pest, PHPUnit, Pint, Sail…). Adicione as suas em `.ai/guidelines/*`.
- **Agent Skills**: módulos de conhecimento carregados sob demanda (Livewire, Inertia, Tailwind…).

### Criar um servidor MCP próprio (`laravel/mcp`)

```bash
php artisan make:mcp-tool CurrentWeatherTool
```

```php
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\{Name, Title, Description};
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Illuminate\Contracts\JsonSchema\JsonSchema;

#[Description('Busca a previsão do tempo para um local.')]
class CurrentWeatherTool extends Tool
{
    public function handle(Request $request): Response
    {
        return Response::text('O tempo em '.$request->get('location').' é...');
    }

    public function schema(JsonSchema $schema): array
    {
        return ['location' => $schema->string()->description('Local')->required()];
    }
}

class WeatherServer extends Server
{
    protected array $tools = [CurrentWeatherTool::class];
    // também: prompts() e resources()
}
```

```php
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp/weather', WeatherServer::class)->middleware(['throttle:mcp']);  // HTTP
Mcp::local('weather', WeatherServer::class);                                   // CLI
```

---

## 3. Laravel Prompts (interação de terminal)

Já incluso no framework; bonito e testável. Ideal em comandos Artisan.

```php
use function Laravel\Prompts\{text, password, select, multiselect, confirm, search,
    suggest, number, textarea, spin, progress, table, note, warning, error, info, alert};

$name = text('Qual seu nome?', placeholder: 'Taylor Otwell', required: true);
$pass = password('Senha', required: true);
$role = select('Função', ['admin' => 'Admin', 'user' => 'Usuário'], default: 'user');
$tags = multiselect('Tags', ['a', 'b', 'c']);
$ok   = confirm('Confirmar?', default: true);
$id   = search('Buscar usuário', fn (string $q) => User::where('name', 'like', "%$q%")->pluck('name', 'id')->all());
$qty  = number('Quantidade', min: 1, max: 10, required: true);

// validação com as regras do Laravel
$email = text(label: 'E-mail', validate: ['email' => 'required|email']);

// feedback
$result = spin(fn () => longTask(), 'Processando...');
$bar = progress('Importando', 100); foreach (range(1,100) as $i) $bar->advance();
table(['ID', 'Nome'], [[1, 'Ana'], [2, 'Bia']]);
note('Feito!'); warning('Atenção'); error('Falhou'); info('Info'); alert('Alerta');
```

```php
// teste
$this->artisan('prompt-user')
    ->expectsQuestion('Qual seu nome?', 'Taylor')
    ->expectsChoice('Função', 'admin', ['admin', 'user'])
    ->assertSuccessful();
```

Suporta macOS/Linux/Windows-WSL, com fallbacks em ambientes não suportados.

---

## 4. Billing — Cashier Stripe / Paddle

### 4.1 Cashier Stripe

```bash
composer require laravel/cashier
php artisan vendor:publish --tag="cashier-migrations"
php artisan migrate
```

```php
use Laravel\Cashier\Billable;

class User extends Authenticatable
{
    use Billable;      // adiciona colunas + subscriptions/subscription_items
}
```

```php
// Cliente e cartão
$user->createOrGetStripeCustomer();
$user->updateStripeCustomer(['name' => $name]);
$user->addPaymentMethod($paymentMethodId);
$user->defaultPaymentMethod();

// Assinaturas
$user->newSubscription('default', 'price_monthly')->create($paymentMethod);
$user->subscribed('default');
$user->subscription('default')->cancel();
$user->subscription('default')->resume();
$user->subscription('default')->onTrial();
$user->subscription('default')->swap('price_yearly');

// Trials
$user->newSubscription('default', 'price')->trialDays(10)->create($paymentMethod);

// Cobranças avulsas e faturas
$user->charge(1000, $paymentMethod);          // centavos
$user->invoiceFor('Serviço', 5000);
$user->invoices();                            // lista
$user->downloadInvoice($id, ['vendor' => 'App']);

// Checkout (redirect)
$checkout = $user->newSubscription('default', 'price')->checkout([...]);
```

- **Webhooks** do Stripe: configure a rota e valide assinatura; o Cashier sincroniza
  `subscriptions`/`invoices`.
- **SCA** e confirmação de pagamentos suportados; teste com `Cashier::fake()` e helpers.
- Versão do Cashier usa uma API do Stripe fixa (ex.: `2025-06-30.basil`).

### 4.2 Cashier Paddle

```bash
composer require laravel/cashier-paddle
```

```php
use Laravel\Cashier\Billable;

class User extends Authenticatable { use Billable; }
// $user->checkout('pri_pro')->returnTo('/dashboard');  // checkout hospedado
// $user->subscribed('default');
```

- Paddle é **merchant of record** (cuida de impostos). API semelhante ao Cashier Stripe.

---

## Resumo de Pontos-Chave

- **AI SDK**: `make:agent`, `prompt()`, imagens (`Image`), áudio/transcrição (`Audio`/`Transcription`),
  embeddings (`Embeddings`) e reranking; testável com `Ai::fake()`.
- **Boost**: MCP + guidelines + skills dão aos agentes contexto versionado da sua app.
- **MCP**: crie ferramentas (`make:mcp-tool`) e servidores (web/local) para expor funcionalidades.
- **Prompts**: CLI bonita e testável (`text`, `select`, `progress`, `spin`, validação do Laravel).
- **Cashier** (Stripe/Paddle): assinaturas, trials, charges, invoices, checkout e webhooks.
