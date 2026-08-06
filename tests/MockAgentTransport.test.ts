import { describe, expect, it, vi } from "vitest";
import { MockAgentTransport } from "@/lib/agent/MockAgentTransport";

describe("MockAgentTransport", () => {
  it("emits flights directly after user message", async () => {
    vi.useFakeTimers();
    const transport = new MockAgentTransport();
    const events: string[] = [];

    transport.subscribe((event) => {
      events.push(event.type);
    });

    await transport.connect();
    const sendPromise = transport.sendMessage("Quiero viajar a Roma");
    await vi.runAllTimersAsync();
    await sendPromise;

    expect(events).toContain("ui.showFlights");
    vi.useRealTimers();
  });

  it("emits flights after dates selected", async () => {
    vi.useFakeTimers();
    const transport = new MockAgentTransport();
    const events: string[] = [];

    transport.subscribe((event) => {
      events.push(event.type);
    });

    await transport.connect();
    const sendEventPromise = transport.sendEvent({
      type: "ui.datesSelected",
      payload: {
        origin: "Madrid",
        destination: "Roma",
        fromDate: "2026-10-12",
        toDate: "2026-10-18",
      },
    });

    await vi.runAllTimersAsync();
    await sendEventPromise;

    expect(events).toContain("ui.showFlights");
    vi.useRealTimers();
  });
});
