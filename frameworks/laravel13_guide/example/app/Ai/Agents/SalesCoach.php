<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

final class SalesCoach implements Agent
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return 'Você é um coach de vendas. Seja conciso e cite evidências do transcript.';
    }
}
