import { strict as assert } from "node:assert";
import { buildEventSchema, decideVendor } from "./failover_service.ts";

const event = buildEventSchema.parse({
  releaseId: "rel-42",
  operation: "release",
  primaryVendor: "vendor-a",
  primaryStatus: "offline",
  artifact: "cli-agent",
});

const decision = decideVendor(event, "vendor-b");
assert.deepEqual(decision, { vendor: "vendor-b", reason: "primary-unavailable" });
console.log("failover decision test passed");
