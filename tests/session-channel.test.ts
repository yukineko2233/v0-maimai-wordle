import { describe, expect, it, vi } from "vitest"
import { SessionChannel } from "../src/client/services/session-channel"

describe("SessionChannel", () => {
  it("does not replay a value that was already delivered live", () => {
    const channel = new SessionChannel<string>()
    const activeListener = vi.fn()
    channel.subscribe(activeListener)
    channel.publish("game-started-state")

    const laterListener = vi.fn()
    channel.subscribe(laterListener)
    expect(activeListener).toHaveBeenCalledWith("game-started-state")
    expect(laterListener).not.toHaveBeenCalled()
  })

  it("delivers an unattended value to exactly one later subscriber", () => {
    const channel = new SessionChannel<string>()
    channel.publish("finished-room")

    const firstListener = vi.fn()
    const secondListener = vi.fn()
    channel.subscribe(firstListener)
    channel.subscribe(secondListener)
    expect(firstListener).toHaveBeenCalledWith("finished-room")
    expect(secondListener).not.toHaveBeenCalled()
  })
})
