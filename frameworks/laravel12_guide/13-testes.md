# Testes no Laravel 12.x

> **Versão:** Laravel 12.x · PHP 8.2–8.5. Foco em **como escrever/rodar testes**:
> unit/feature, HTTP, JSON, banco/factories, console, mocks/fakes e Dusk (browser).
> Suporta Pest e PHPUnit.

---

## 1. Ambiente e execução

- `phpunit.xml` já define o ambiente `testing` (cache/sessão em `array`, sem persistência).
- Opcional: `.env.testing` é usado quando `APP_ENV=testing` / `--env=testing`.
- Após mexer em config: `php artisan config:clear` antes dos testes.

```bash
php artisan make:test UserTest          # tests/Feature
php artisan make:test UserTest --unit   # tests/Unit
php artisan test                        # runner artesanal (relatório bonito)
php artisan test --parallel             # bacia/paratest (precisa brianium/paratest)
php artisan test --processes=4
php artisan test --coverage --min=80
php artisan test --profile               # 10 testes mais lentos
./vendor/bin/pest ; ./vendor/bin/phpunit
```

Bancos de teste em paralelo são criados automaticamente (`seu_db_test_1`, `..._2`).
Use `--recreate-databases` para recriá-los.

---

## 2. Feature/Unit básico

```php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\{User, Post};

class PostTest extends TestCase
{
    use RefreshDatabase;              // recria/rollback o schema por teste (recomendado)

    public function test_index_lists_posts(): void
    {
        $user  = User::factory()->create();
        $posts = Post::factory()->count(3)->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get('/posts')
            ->assertOk()
            ->assertSee($posts[0]->title);
    }

    public function test_guest_is_redirected(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }
}
```

Trait de banco: `RefreshDatabase` (preferido) · `DatabaseMigrations` · `DatabaseTransactions`.
Para performance, `WithCachedConfig` reutiliza a config entre testes.

---

## 3. Testando HTTP e JSON (`http-tests`)

```php
// requests com verbos
$response = $this->get('/');
$response = $this->post('/posts', ['title' => 'x']);
$this->getJson('/api/users');
$this->postJson('/api/users', ['name' => 'Sally']);
$this->putJson(...); $this->patchJson(...); $this->deleteJson(...);

// estado/autenticação
$this->actingAs($user);                    // usa o guard padrão
$this->actingAs($user, 'admin');
$this->actingAsGuest();
$this->withHeaders(['X-Token' => 'abc']);
$this->from('/previous')->post('/x', [...]);   // redireciona "back" para cá

// sessão e cookies
$response->assertSessionHas('status', 'ok');
$response->assertSessionHasErrors(['email']);
$response->assertCookie('name');

// redirecionamento, status
$response->assertRedirect('/home');
$response->assertRedirectToRoute('dashboard');
$response->assertStatus(201);
$response->assertOk(); $response->assertCreated(); $response->assertNoContent();
$response->assertUnauthorized(); $response->assertForbidden(); $response->assertNotFound();

// conteúdo
$response->assertSee('Hello');
$response->assertSeeText('Hello');         // ignora tags
$response->assertDontSee('secret');
$response->assertViewIs('posts.index');
$response->assertViewHas('posts');
$response->assertViewHas('posts', fn ($posts) => $posts->count() === 3);
```

JSON:

```php
$response->assertJson(['name' => 'Sally']);          // fragmento existe
$response->assertExactJson([...]);                   // match exato
$response->assertJsonPath('team.owner.name', 'Darian');
$response->assertJsonStructure(['data' => [['id', 'name']]]);
$response->assertJsonCount(3, 'data');
$response->assertJsonMissing(['secret']);

// fluente (AssertableJson)
$response->assertJson(fn (AssertableJson $json) =>
    $json->has('data', 3)
        ->where('data.0.name', 'Sally')
        ->missing('secret')
        ->etc()
);
```

Uploads:

```php
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

Storage::fake('public');
$file = UploadedFile::fake()->image('avatar.jpg');
$this->post('/avatar', ['avatar' => $file])
    ->assertOk();
Storage::disk('public')->assertExists('avatars/'.$file->hashName());
```

Views/Blade:

```php
$view = $this->view('posts.index', ['posts' => Post::factory()->create()]);
$view->assertSee('Posts');
// componentes: $this->blade('<x-alert type="error">Oi</x-alert>');
```

---

## 4. Banco, factories e seeders (`database-testing`)

```php
use App\Models\User;

$user = User::factory()->create();
$users = User::factory()->count(3)->create();
User::factory()->for(Team::class)->create();
User::factory()->has(Post::factory()->count(3))->create();
User::factory()->admin()->create();          // state

// asserts de banco
$this->assertDatabaseHas('users', ['email' => $user->email]);
$this->assertDatabaseMissing('users', ['email' => 'x@x.com']);
$this->assertDatabaseCount('users', 1);
$this->assertDatabaseEmpty('posts');
$this->assertModelExists($user);
$this->assertModelMissing($user);
$this->assertSoftDeleted($post);
$this->assertNotSoftDeleted($post);

// seeders sob demanda
$this->seed();                                // DatabaseSeeder
$this->seed(UserSeeder::class);
```

---

## 5. Console (`console-tests`)

```php
public function test_command(): void
{
    $this->artisan('emails:send', ['user' => 'Ana'])
        ->expectsOutput('Enviando...')
        ->assertSuccessful();          // ou ->assertFailed()

    $this->artisan('question')
        ->expectsQuestion('Qual seu nome?', 'Taylor')
        ->expectsChoice('Estado?', 'SP', ['SP', 'RJ'])
        ->expectsConfirmation('Continuar?', 'yes')
        ->expectsTable(['ID', 'Nome'], [[1, 'Ana']])
        ->assertExitCode(0);

    $this->artisan('emails:send')
        ->expectsOutputToContain('Enviando')
        ->assertOk();
}
```

---

## 6. Mocking, fakes e tempo (`mocking`)

```php
// fakes de subsistemas
Http::fake(['github.com/*' => Http::response(['ok' => true], 200)]);
Mail::fake(); Mail::assertQueued(OrderShipped::class);
Queue::fake(); Queue::assertPushed(ProcessPodcast::class, 1);
Bus::fake(); Bus::assertBatched(fn ($batch) => ...);
Event::fake([OrderShipped::class]); Event::assertDispatched(OrderShipped::class);
Event::fakeExcept([CacheHit::class]);
Notification::fake(); Notification::assertSentTo($user, InvoicePaid::class);
Storage::fake('s3'); Cache::spy(); Exceptions::fake();
// Ao final de Http::fake, re-habilite: Http::preventStrayRequests();

// mocks de objetos/containers
$this->mock(PaymentGateway::class, fn ($mock) => $mock->shouldReceive('charge')->once()->andReturn(true));
$this->instance(Service::class, $fake);
$mock = Mockery::mock(Service::class);

// facades
Cache::shouldReceive('get')->with('key')->andReturn('value');

// tempo
$this->travel(5)->minutes();
$this->travelTo(now()->minus(hours: 6));
$this->freezeTime();
$this->travelBack();
```

---

## 7. Dusk (browser/E2E)

```bash
composer require laravel/dusk --dev
php artisan dusk:install
php artisan dusk
php artisan dusk:make LoginTest
php artisan dusk:chrome-driver --detect
```

```php
namespace Tests\Browser;

use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class LoginTest extends DuskTestCase
{
    public function test_login(): void
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/login')
                ->type('email', 'ana@example.com')
                ->type('password', 'secret')
                ->press('Entrar')
                ->assertPathIs('/dashboard')
                ->assertSee('Dashboard');
        });
    }
}
```

- **Pages** (`php artisan dusk:page Login`) e **Components** organizam seletores.
- `$browser->waitFor('.selector')`, `->click()`, `->select()`, `->check()`, `->attach()`.
- Assertivas: `assertSee`, `assertPathIs`, `assertPresent`, `assertChecked`, `assertValue`.
- Use `DUSK_HEADLESS_DISABLED`/`--without-tty` em CI; `dusk:fails` para retry.

---

## 8. Boas práticas

- Feature test para rotas/HTTP; unit para lógica pura.
- Uma asserção conceitual por teste; nomes descritivos.
- Prefira **fakes** a mocks; mocke só fronteiras externas.
- `RefreshDatabase` + factories com `states`.
- `php artisan test --parallel` em suites grandes; `--profile` para otimizar.
- Cubra: autenticação, autorização (403), validação (422), happy path e bordas.

---

## Resumo de Pontos-Chave

- `php artisan test` (+ `--parallel`, `--coverage`); Pest e PHPUnit suportados.
- **RefreshDatabase** + factories/states; asserts de banco (`assertDatabaseHas`…).
- HTTP: `getJson/postJson`, `actingAs`, `assertJson*`, `assertRedirect`, `assertSessionHas`.
- Uploads com `UploadedFile::fake()` + `Storage::fake()`.
- Console: `$this->artisan()->expectsQuestion()->assertSuccessful()`.
- Fakes de Http/Mail/Queue/Event/Notification/Bus/Storage/Cache/Exceptions.
- Tempo: `travel`, `travelTo`, `freezeTime`, `travelBack`.
- **Dusk** para E2E de browser (Pages/Components, CI headless).
