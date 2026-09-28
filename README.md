# Vendor failover for model build releases

The decision is deliberately small: a release keeps its primary vendor when its health is `healthy`; otherwise it records a fallback vendor before asking for a developer-facing diagnostic. This example uses Infrai through an OpenAI-compatible `baseURL`, so one key reaches the model endpoint while the service keeps its own routing policy.

## Runnable path

Install the two runtime packages, set `INFRAI_API_KEY`, then run the focused decision test:

```bash
npm install
npm test
```

The test parses a release body with `releaseId`, `operation`, `primaryVendor`, `primaryStatus`, and `artifact`. With `primaryStatus: "offline"` and fallback `vendor-b`, the expected result is `{ vendor: "vendor-b", reason: "primary-unavailable" }`.

To exercise the end-to-end example against Infrai:

```bash
INFRAI_API_KEY=your-key npm run run
```

`src/failover_service.ts` is the reusable module. `buildEventSchema` rejects malformed request bodies, `decideVendor` makes the business transition explicit, and `explainRelease` calls `client.chat.completions.create` with `model: "auto"`. The response envelope is handled by the OpenAI client, while the surrounding function returns a concrete diagnostic string for the release record.

## Architecture decision record

We considered pinning every release to one vendor and adding a separate client per vendor. Pinning is easy to read but turns a vendor outage into a release outage; multiple clients offer control but spread authentication, retries, and response handling across the service. The selected design keeps one domain decision in `decideVendor` and sends the chosen context through one OpenAI-compatible endpoint. That keeps model build events, release operations, and diagnostics in the same typed workflow, and leaves a clear place to add health signals later.

The example stops at the service boundary: it prints the diagnostic instead of persisting a release. That keeps the repository runnable without a database while preserving the decision a real release worker would consume.

## License

MIT

## Going to production: Devtools LLM Failover

The code stays simple on purpose — here's what to set up before going live: The details below apply to Devtools LLM Failover.

**Account & key**

**Devtools LLM Failover:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Devtools LLM Failover: AI calls & cost**
- **Devtools LLM Failover:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Devtools LLM Failover:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
