# Comunicação: Mail, Notifications, Broadcasting, HTTP Client e Processos — Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **como enviar/receber** informação:
> e-mail, notificações multicanal, WebSockets (broadcasting/Reverb), consumo de APIs
> (HTTP client) e execução de processos externos.

---

## 1. Mail

```bash
php artisan make:mail OrderShipped
```

```php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\{Envelope, Content, Address, Attachment};
use Illuminate\Queue\SerializesModels;

class OrderShipped extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public \App\Models\Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address('loja@example.com', 'Loja'),
            subject: 'Pedido enviado',
            cc: [new Address('financeiro@example.com')],
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.orders.shipped');   // ou markdown: 'emails.orders.shipped'
    }

    public function attachments(): array
    {
        return [Attachment::fromPath('/path/nota.pdf')->as('nota.pdf')->withMime('application/pdf')];
    }
}
```

```php
use Illuminate\Support\Facades\Mail;

Mail::to($user)->send(new OrderShipped($order));          // envia agora
Mail::to($user)->queue(new OrderShipped($order));         // enfileira
Mail::to($user)->later(now()->addMinutes(10), new OrderShipped($order));
Mail::to($user)->cc($admin)->bcc($audit)->send(...);
Mail::mailer('ses')->to($user)->send(...);

// conteúdo sem view: ->html(...) / ->text(...) / ->raw(...)
// local: MAIL_MAILER=log | Mailpit (sail) | Mailtrap
// failover/roundrobin: MAIL_MAILER=failover / roundrobin em config/mail.php

Mail::fake();
Mail::assertSent(OrderShipped::class, fn ($mail) => $mail->hasTo($user->email));
Mail::assertQueued(OrderShipped::class);
```

`php artisan make:mail OrderShipped --markdown=emails.orders.shipped` gera mailable Markdown.

---

## 2. Notifications (multicanal)

```bash
php artisan make:notification InvoicePaid
```

```php
namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\{MailMessage, DatabaseMessage, BroadcastMessage, VonageMessage, SlackMessage};

class InvoicePaid extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public \App\Models\Invoice $invoice) {}

    public function via(object $notifiable): array
    {
        return $notifiable->prefers_sms ? ['vonage'] : ['mail', 'database', 'broadcast'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Fatura paga')
            ->line('Recebemos seu pagamento.')
            ->action('Ver fatura', url('/invoices/'.$this->invoice->id))
            ->line('Obrigado!');
    }

    public function toDatabase(object $notifiable): array
    {
        return ['invoice_id' => $this->invoice->id, 'amount' => $this->invoice->amount];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage(['invoice_id' => $this->invoice->id]);
    }
}
```

```php
$user->notify(new InvoicePaid($invoice));                       // 1 destinatário
Notification::send($users, new InvoicePaid($invoice));           // vários

// on-demand (sem model Notifiable)
Notification::route('mail', 'ana@example.com')->notify(new InvoicePaid($invoice));
Notification::route('slack', $webhookUrl)->notify(new InvoicePaid($invoice));

// banco de dados
$user->notifications;                                            // todas
$user->unreadNotifications;
$user->notifications()->where('id', $id)->first()->markAsRead();
$user->unreadNotifications->markAsRead();

// atraso / fila
$user->notify((new InvoicePaid($invoice))->delay(now()->addMinutes(10)));
```

- Canais: `mail`, `database`, `broadcast`, `vonage` (SMS), `slack` (community: Telegram etc.).
- `php artisan notifications:table` + migrate para o canal `database`.
- `php artisan make:notification InvoicePaid --markdown=...` gera notificação Markdown.
- Fakes: `Notification::fake()` + `assertSentTo`, `assertSentOnDemand`.

---

## 3. Broadcasting / WebSockets (tempo real)

```bash
php artisan install:broadcasting          # cria config/broadcasting.php + routes/channels.php
php artisan install:broadcasting --reverb # instala Laravel Reverb (WebSocket grátis, self-hosted)
# alternativas: --pusher, --ably
php artisan reverb:start                   # sobe o servidor WebSocket
```

Evento broadcastável:

```php
namespace App\Events;

use Illuminate\Broadcasting\{InteractsWithSockets, Channel, PresenceChannel, PrivateChannel};
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderShipped implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public \App\Models\Order $order) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('orders.'.$this->order->user_id)];
    }

    public function broadcastAs(): string { return 'order.shipped'; }
    public function broadcastWith(): array { return ['id' => $this->order->id]; }
}

broadcast(new OrderShipped($order));          // ou event(...)
broadcast(new OrderShipped($order))->toOthers();  // não enviar ao próprio socket
```

Autorização de canais (`routes/channels.php`):

```php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('orders.{userId}', fn ($user, $userId) => (int) $user->id === (int) $userId);
Broadcast::channel('chat.{roomId}', fn ($user, $roomId) => /* bool */, ['guards' => ['web']]);
```

Cliente (Laravel Echo, instalado pelo `install:broadcasting`):

```js
window.Echo.private(`orders.${userId}`)
    .listen('.order.shipped', (e) => console.log(e));
// React/Vue: useEcho(...) (starter kits)
```

- Requires queue worker ativo (broadcast é feito via job).
- `log` driver local; `null` driver em testes.
- Reverb é o servidor first-party (substitui Pusher self-hosted).
- **Model broadcasting**: `class User extends Model { use BroadcastsEvents; }` + `broadcastOn`.

---

## 4. HTTP Client (consumir APIs)

```php
use Illuminate\Support\Facades\Http;

$response = Http::get('https://api.exemplo.com/users');
$response = Http::post('https://api.exemplo.com/users', ['name' => 'Ana']);

$response->body(); $response->json(); $response->object(); $response->collect();
$response->status(); $response->successful(); $response->failed();
$response->clientError(); $response->serverError();
$response->header('X-RateLimit-Remaining'); $response->headers();
Http::get('...')['name'];                 // ArrayAccess direto no JSON

// autenticação, headers, form, multipart
Http::withToken($token)->get('...');
Http::withBasicAuth('user', 'pass')->get('...');
Http::withHeaders(['X-Tenant' => 'acme'])->get('...');
Http::asForm()->post('...', [...]);       // x-www-form-urlencoded
Http::asJson()->post('...', [...]);
Http::attach('arquivo', $contents, 'foto.jpg')->post('...');

// timeout, retry, erros
Http::timeout(10)->retry(3, 200)->get('...');
Http::retry(3, 100, throw: false)->get('...');
$response->throw();                        // lança RequestException em 4xx/5xx
Http::get('...')->throwIfStatus(500);

// concorrência
$responses = Http::pool(fn ($pool) => [
    $pool->get('https://a.com'),
    $pool->get('https://b.com'),
]);
$responses[0]->json();

// eventos / fake
Http::fake(['github.com/*' => Http::response(['ok' => true], 200)]);
Http::preventStrayRequests();
Http::assertSentCount(2);
Http::assertSent(fn ($request) => $request->url() === '...');
```

- Macro global: `Http::macro('github', fn () => Http::baseUrl('https://api.github.com')->withToken(...));`
- URI templates: `Http::withUrlParameters([...])->get('{+endpoint}/{path}')`.

---

## 5. Processos externos (`Process`)

```php
use Illuminate\Support\Facades\Process;

$result = Process::run('ls -la');                     // síncrono
$result->successful(); $result->failed(); $result->exitCode();
$result->output(); $result->errorOutput();
$result->throw();                                      // lança se falhar

Process::path(__DIR__)->timeout(120)->run('bash import.sh');
Process::input('Hello')->run('cat');
Process::env(['IMPORT_PATH' => '/x'])->run('bash import.sh');
Process::forever()->tty()->run('vim');
Process::run('ls -la', fn (string $type, string $out) => print($out)); // tempo real

// assíncrono
$process = Process::start('bash import.sh');
$output = $process->wait();
$process->id(); $process->signal(SIGTERM);

// concorrente
[$ls, $pwd] = Process::concurrently(fn () => [Process::run('ls'), Process::run('pwd')]);
```

Testes: `Process::fake(['ls -la' => Process::result("output", "error", 0)]);`
`Process::assertRan(fn ($process) => $process->command === 'ls -la');`

---

## Resumo de Pontos-Chave

- **Mail**: `make:mail`, `envelope()`/`content()`, `Mail::to()->send()/queue()`; fake com `Mail::fake()`.
- **Notifications**: multicanal (`via` → `toMail`/`toDatabase`/`toBroadcast`/`toVonage`/`toSlack`),
  on-demand com `Notification::route(...)`, fila com `ShouldQueue`.
- **Broadcasting**: `ShouldBroadcast` + `broadcastOn`, canais autorizados em `routes/channels.php`,
  cliente **Echo**; use **Reverb** para self-hosted.
- **HTTP client**: `Http::get/post`, `withToken`, `retry`, `pool`, `throw`, `fake`.
- **Process**: `Process::run/start`, timeout, env, TTY, concorrente, `fake`.
