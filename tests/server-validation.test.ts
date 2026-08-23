import { describe, expect, it } from "vitest"
import { socketSchemas } from "../src/server/validation"
import { normalizeVersion } from "../src/shared/domain/versions"

describe("server input validation", () => {
  it("rejects malformed room payloads", () => {
    expect(socketSchemas.room.safeParse({ roomId: "../../" }).success).toBe(false)
    expect(socketSchemas.makeGuess.safeParse({ roomId: "ABC234", songId: "1" }).success).toBe(false)
  })

  it("does not map unknown versions to the latest release", () => {
    expect(normalizeVersion("future release")).toBeNull()
  })
})
