import { runRelease } from "./failover_service.ts";

const body = {
  releaseId: "rel-demo",
  operation: "model-build" as const,
  primaryVendor: "vendor-a",
  primaryStatus: "degraded" as const,
  artifact: "agent-tools",
};

const result = await runRelease(body);
console.log(JSON.stringify(result, null, 2));
