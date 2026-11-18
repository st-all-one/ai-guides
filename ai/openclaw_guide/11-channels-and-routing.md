# 11 - Channels and routing

Replies return to the channel where a message arrived; the model does not pick a channel, and host configuration controls routing (`pages/channels/channel-routing.md:10-14`). A **channel** is a plugin (`discord`, `slack`, `telegram`, `whatsapp`, and others); `webchat` is the internal UI channel, not a configurable outbound channel (`:17`). **AccountId** identifies a login instance, **agentId** an isolated workspace plus session store, and **SessionKey** the concurrency bucket (`:18-23`).

## Channel family map

| channel family | ingress control | routing key | evidence |
| --- | --- | --- | --- |
| Discord | DM pairing / allowlist; guild, channel, and Discord roles | `agent:<id>:discord:channel:<id>[:thread:<id>]` | `pages/channels/channel-routing.md:58-59`, `:68`; `pages/concepts/agent-bindings.md:107` |
| Slack | DM pairing / allowlist; `teamId` and channel peers | `agent:<id>:slack:channel:<id>:thread:<rootTs>` | `pages/channels/slack/threads-and-sessions.md:20-22`; `pages/channels/channel-routing.md:105` |
| Telegram | DM pairing / group policy; forum topics | `agent:<id>:telegram:group:<chatId>:topic:<threadId>` | `pages/channels/telegram/threads-and-sessions.md:17-19`; `pages/channels/channel-routing.md:69` |
| Matrix | DM pairing / room allowlist; native threads | per-user or per-room DM scope, thread sessions isolated | `pages/channels/matrix/threads-and-sessions.md:20-23`, `:59-61` |
| WhatsApp | pairing / allowlist per account; DM split by sender E.164 | peer binding on one account, main session by default | `pages/concepts/multi-agent.md:272-278`; `pages/channels/pairing.md:96` |
| A2A | per-peer bearer token; no unauthenticated mode | authenticated peer + `contextId`, most isolated DM scope | `pages/channels/a2a.md:174-182`, `:188` |
| WebChat | Control UI authentication; internal channel | selected agent's main session | `pages/channels/channel-routing.md:211-215` |

## How an inbound message selects an agent

Ordinary routing picks exactly one agent, in this order: exact peer match; parent peer (thread inheritance); peer wildcard; Discord guild plus roles; guild; Slack team; account; channel (`accountId: "*"`); then fallback owner, sole agent, or retained legacy owner (`pages/channels/channel-routing.md:96-110`). Multiple agents without an owner require a matching binding rather than a roster guess (`:108`). Multiple match fields must all match (`:112`). The matched agent determines the workspace and session store (`:114`).

Configuration example (`pages/channels/channel-routing.md:157-178`):

```json5
{
  agents: {
    entries: {
      support: {
        name: "Support",
        workspace: "~/.openclaw/workspace-support",
      },
    },
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    {
      match: { channel: "slack", peer: { kind: "channel", id: "C0123TEAM" } },
      agentId: "support",
      session: { groupScope: "main" },
    },
  ],
}
```

Bindings only choose the agent after channel admission; pairing, `dmPolicy`, group policy, and allowlists are separate controls (`pages/concepts/agent-bindings.md:11-13`, `:125-127`).

## Session mapping and per-channel threads

Direct messages collapse to `agent:<agentId>:main` under the default `session.dmScope: main`; `per-peer`, `per-channel-peer`, and `per-account-channel-peer` split them, and a binding can override scope for its peers (`pages/channels/channel-routing.md:40-49`). The runtime builder emits exactly those variants and a per-group `agent:<id>:<channel>:<peerKind>:<peerId>` key (`src/routing/session-key.ts:179-234`). With default `session.groupScope: "per-group"`, groups use `agent:<id>:<channel>:group:<id>` and rooms use `agent:<id>:<channel>:channel:<id>`; `"main"` folds them into the main session (`pages/channels/channel-routing.md:55-64`). Thread keys append `:thread:<threadId>` (`src/routing/session-key.ts:291-309`).

Slack channel and thread replies use the parent `thread_ts` suffix, with Agent View roots kept isolated even under `main` scope (`pages/channels/slack/threads-and-sessions.md:17-21`, `:58-62`). Discord threads route as channel sessions and inherit parent config unless overridden (`pages/channels/discord/threads-and-sessions.md:91-93`). Telegram forum topics append `:topic:<threadId>` and can each route to a different agent (`pages/channels/telegram/threads-and-sessions.md:17-25`). Matrix supports native threads with room history not copied into a new thread's first prompt (`pages/channels/matrix/threads-and-sessions.md:59-63`).

## Access control and pairing

Defaults are `dmPolicy: "pairing"` and `groupPolicy: "allowlist"`; `open` is public only when `allowFrom` includes `"*"` (`pages/gateway/config-channels/shared-policies.md:18-25`; `pages/channels/pairing.md:26-29`). Unknown senders under `pairing` receive a code and their message is not processed until approval (`pages/channels/pairing.md:18-22`). Codes are 8 uppercase characters, expire after one hour, and are capped at 3 pending requests per channel account (`:31-35`). Approvals cover DMs only, not group commands; state lives in `~/.openclaw/state/openclaw.sqlite` as `channel_pairing_requests` and `channel_pairing_allow_entries` (`:44-46`, `:131-150`). Node device pairing is a separate approval flow (`:161-165`). Top-level `accessGroups` reuse a trusted sender set across channels (`pages/channels/pairing.md:102-127`).

## Groups, presence, and loop defaults

Group allowlists still gate broadcast fan-out; qualified group threads can let a mention of any participant satisfy the room mention gate (`pages/channels/broadcast-groups.md:18-20`). Ambient room events turn unmentioned allowed chatter into quiet context: `messages.groupChat.unmentionedInbound: "room_event"` plus `visibleReplies: "message_tool"` requires the `message` tool, and typing receipts stay suppressed unless `ackReactionScope: "all"` (`pages/channels/ambient-room-events.md:11-15`, `:35-41`, `:61-71`).

Presence is a best-effort view of the Gateway and connected clients, shown in Control UI **Devices** and the macOS app; the `presence` tool lists people with `operator.read` access (`pages/concepts/presence.md:10-16`, `:24-35`, `:112-119`). Bot-loop protection bounds bot-pair exchanges with `enabled: true`, `maxEventsPerWindow: 20`, `windowSeconds: 60`, and `cooldownSeconds: 60`; it does not affect humans, single-bot deployments, or self-message filtering (`pages/channels/bot-loop-protection.md:16-31`). Its narrowest-override precedence runs room, account, channel, shared defaults, then built-ins (`:49-57`).

## Sources

- https://docs.openclaw.ai/channels/channel-routing
- https://docs.openclaw.ai/channels/pairing
- https://docs.openclaw.ai/gateway/config-channels/shared-policies
- https://docs.openclaw.ai/concepts/agent-bindings
- https://docs.openclaw.ai/concepts/multi-agent
- https://docs.openclaw.ai/channels/telegram/threads-and-sessions
- https://docs.openclaw.ai/channels/discord/threads-and-sessions
- https://docs.openclaw.ai/channels/slack/threads-and-sessions
- https://docs.openclaw.ai/channels/matrix/threads-and-sessions
- https://docs.openclaw.ai/channels/broadcast-groups
- https://docs.openclaw.ai/channels/ambient-room-events
- https://docs.openclaw.ai/channels/bot-loop-protection
- https://docs.openclaw.ai/concepts/presence
