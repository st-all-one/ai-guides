<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\PaymentGateway;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Attributes\Backoff;
use Illuminate\Queue\Attributes\Timeout;
use Illuminate\Queue\Attributes\Tries;
use Illuminate\Queue\Attributes\UniqueFor;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\Log;

#[Tries(3)]
#[Backoff([10, 30, 60])]
#[Timeout(120)]
#[UniqueFor(3600)]
final class ChargePayment implements ShouldQueue
{
    use Queueable;

    public function __construct(public Payment $payment) {}

    public function handle(PaymentGateway $gateway): void
    {
        // Propagação do correlation ID recebido no dispatch via Context.
        Context::add('payment_id', $this->payment->id);

        $gateway->charge($this->payment);

        Log::info('payment.charged', ['payment_id' => $this->payment->id]);
    }
}
