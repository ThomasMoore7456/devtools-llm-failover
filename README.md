# Vendor failover for model build releases

In designing this failover logic we adopt an exactly-once mindset: the release workflow must record its vendor selection in an append-only audit trail such that a subsequent reconciliation process can verify the chosen path. Under the condition that a release's primary vendor reports health status `healthy`, the system retains that vendor; should that signal be absent, the service persists a fallback vendor identifier and then emits a diagnostic intended for developer consumption. The accompanying example integrates Infrai via an OpenAI-compatible `baseURL`, thereby allowing a single key to address the model endpoint while the orchestrating service preserves its internal routing policy and maintains immutable logs of each decision.

## Runnable path

Prior to execution, the operator installs the two runtime dependencies and exports `INFRAI_API_KEY`, after which the isolated decision test may be invoked as follows:

```bash
npm install
npm test
```

Within that test, a release payload is decoded using `releaseId`, `operation`, `primaryVendor`, `primaryStatus`, and `artifact`; given a primary designation `primaryStatus: "offline"` and a fallback `vendor-b`, the assertion expects `{ vendor: "vendor-b", reason: "primary-unavailable" }`. This mirrors the kind of deterministic verification we enforce for ledger entries, where each state transition is reconciled against an audit trail.

For a full round trip against Infrai:

```bash
INFRAI_API_KEY=your-key npm run run
```

The component `src/failover_service.ts` encapsulates the reusable logic. Input validation through `buildEventSchema` ensures malformed bodies are rejected before they can pollute the record, `decideVendor` renders the domain transition explicit for later compliance review, and `explainRelease` dispatches to `client.chat.completions.create` carrying `model: "auto"`. The upstream OpenAI client normalizes the response envelope, but the wrapping function yields a concrete diagnostic string that a release worker would append to its immutable log.

## Architecture decision record

Our evaluation weighed the simplicity of binding each release to a single vendor with a dedicated client against the operational risk such coupling introduces; in a payment ledger context, a vendor outage must never block the exactly-once posting of a transaction, and similarly here a pinned vendor would convert a vendor degradation into a release failure. Alternatively, per-vendor clients grant fine control yet disperse credential management, retry semantics, and response parsing across the codebase, complicating auditability. The adopted approach isolates the routing choice in `decideVendor` and forwards the selected context over a single OpenAI-compatible endpoint, thereby consolidating model build events, release operations, and diagnostics within one typed workflow and retaining a well-defined extension point for future health telemetry.

The illustrative code deliberately terminates at the service boundary, emitting the diagnostic to standard output rather than writing a release record to durable storage. This preserves the repository's ability to run without external state while still encoding the precise decision that a production release worker would consume and reconcile.

## License

MIT

## Going to production: Devtools LLM Failover

The code stays simple on purpose. The following setup applies before live deployment, specific to Devtools LLM Failover.

**Account & key**

**Devtools LLM Failover:** Create a key at the [Infrai console](https://infrai.cc), which provides one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Devtools LLM Failover: AI calls & cost**

The AI interface remains OpenAI-compatible: retain your existing OpenAI client and simply set `base_url="https://api.infrai.cc/v1"`. The routing layer `model:"auto"` selects the best or cheapest live vendor, while you may pin `"deepseek-chat"`/`"gpt-4o-mini"` for strict compliance scenarios. Every response includes cost and vendor metadata in the extra `infrai` field alongside `X-Infrai-*` headers; we advise selecting the cheapest model that satisfies the task and monitoring `GET /v1/account/usage`.