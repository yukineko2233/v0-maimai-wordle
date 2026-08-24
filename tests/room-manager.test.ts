import { afterEach, describe, expect, it, vi } from "vitest"
import type { Server as SocketIOServer, Socket } from "socket.io"
import { RoomManager } from "../src/server/multiplayer/room-manager"
import type { GameSettings, MultiplayerRoom, Song } from "../src/shared/types"

const song: Song = {
  id: 1,
  sourceIndex: 1,
  title: "Answer",
  type: "DX",
  artist: "Artist",
  genre: "舞萌",
  bpm: 180,
  version: "舞萌DX 2026",
  masterDs: 14,
  masterLevel: "14",
  masterDesigner: "Designer",
  remasterDs: null,
  remasterLevel: null,
  remasterDesigner: null,
  winRate: 0,
  voteTotal: 0,
  aliases: [],
  tags: [],
}

const settings: GameSettings = {
  versionRange: { min: "maimai", max: "舞萌DX 2026" },
  genres: [],
  masterLevelRange: { min: "1", max: "15" },
  maxGuesses: 6,
  topSongs: 2000,
  timeLimit: 1,
}

interface RecordedEvent {
  target: string
  event: string
  payload: any
}

class FakeIo {
  events: RecordedEvent[] = []
  sockets = { sockets: new Map<string, FakeSocket>() }

  emit(event: string, payload: any) {
    this.events.push({ target: "all", event, payload })
  }

  to(target: string) {
    return {
      emit: (event: string, payload: any) => this.events.push({ target, event, payload }),
    }
  }
}

class FakeSocket {
  events: Array<{ event: string; payload: any }> = []
  rooms = new Set<string>()

  constructor(public id: string, io: FakeIo) {
    io.sockets.sockets.set(id, this)
  }

  emit(event: string, payload: any) {
    this.events.push({ event, payload })
  }

  join(roomId: string) {
    this.rooms.add(roomId)
  }

  leave(roomId: string) {
    this.rooms.delete(roomId)
  }
}

function setup(bestOf: 1 | 3 = 3, gameSettings: GameSettings = settings) {
  const io = new FakeIo()
  const manager = new RoomManager(io as unknown as SocketIOServer, () => [song])
  const host = new FakeSocket("host-socket", io)
  manager.createRoom(host as unknown as Socket, { nickname: "Host", settings: gameSettings, bestOf })
  const created = host.events.find((entry) => entry.event === "room_created")!.payload
  return { io, manager, host, created }
}

function joinAndStart(context: ReturnType<typeof setup>) {
  const guest = new FakeSocket("guest-socket", context.io)
  context.manager.joinRoom(guest as unknown as Socket, { roomId: context.created.roomId, nickname: "Guest" })
  const joined = guest.events.find((entry) => entry.event === "room_joined")!.payload
  context.manager.toggleReady(guest as unknown as Socket, { roomId: context.created.roomId })
  context.manager.startGame(context.host as unknown as Socket, { roomId: context.created.roomId })
  return { guest, joined }
}

function latestRoom(io: FakeIo, event: string): MultiplayerRoom {
  return io.events.filter((entry) => entry.event === event).at(-1)!.payload.room
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe("RoomManager multiplayer authority", () => {
  it("never exposes internal session data or a playing answer", () => {
    vi.useFakeTimers()
    const context = setup()
    expect(context.created.room.targetSong).toBeNull()
    expect(JSON.stringify(context.created.room)).not.toContain("sessionToken")
    expect(context.created.sessionToken).toHaveLength(43)

    joinAndStart(context)
    const playingRoom = latestRoom(context.io, "game_started")
    expect(playingRoom.targetSong).toBeNull()
    expect(playingRoom.serverTime).toBe(Date.now())
    expect(playingRoom.roundDeadline).toBe(Date.now() + 1000)
    expect(JSON.stringify(playingRoom)).not.toContain(context.created.sessionToken)

    vi.advanceTimersByTime(6000)
    const endedRoom = latestRoom(context.io, "round_ended")
    expect(endedRoom.targetSong?.id).toBe(song.id)
    expect(endedRoom.roundSettled).toBe(true)
  })

  it("only sends each viewer their own guess history", () => {
    vi.useFakeTimers()
    const context = setup()
    const { joined } = joinAndStart(context)
    context.manager.makeGuess(context.host as unknown as Socket, { roomId: context.created.roomId, songId: song.id })

    const hostUpdate = context.io.events.filter(
      (entry) => entry.event === "game_updated" && entry.target === context.host.id,
    ).at(-1)!.payload.room as MultiplayerRoom
    const guestUpdate = context.io.events.filter(
      (entry) => entry.event === "game_updated" && entry.target === "guest-socket",
    ).at(-1)!.payload.room as MultiplayerRoom
    expect(hostUpdate.players[context.created.playerId].currentRound.guesses).toHaveLength(1)
    expect(guestUpdate.players[context.created.playerId].currentRound.guesses).toHaveLength(0)
    expect(guestUpdate.players[joined.playerId].currentRound.guesses).toHaveLength(0)
  })

  it("only restores an offline player, preserves playerId, and rotates the token", () => {
    vi.useFakeTimers()
    const context = setup()
    const originalPlayerId = context.created.playerId
    const originalToken = context.created.sessionToken

    const onlineAttempt = new FakeSocket("online-attempt", context.io)
    context.manager.reconnectSession(onlineAttempt as unknown as Socket, { sessionToken: originalToken })
    expect(onlineAttempt.events.at(-1)?.event).toBe("reconnect_failed")

    context.manager.handleDisconnect(context.host as unknown as Socket)
    const replacement = new FakeSocket("replacement", context.io)
    context.manager.reconnectSession(replacement as unknown as Socket, { sessionToken: originalToken })
    const restored = replacement.events.find((entry) => entry.event === "reconnected")!.payload
    expect(restored.playerId).toBe(originalPlayerId)
    expect(restored.sessionToken).not.toBe(originalToken)
    expect(restored.room.players[originalPlayerId].online).toBe(true)

    const replay = new FakeSocket("replay", context.io)
    context.manager.reconnectSession(replay as unknown as Socket, { sessionToken: originalToken })
    expect(replay.events.at(-1)?.event).toBe("reconnect_failed")
  })

  it("enforces one room per socket and replays a tied best-of-one", () => {
    vi.useFakeTimers()
    const context = setup(1)
    const { guest } = joinAndStart(context)

    context.manager.createRoom(context.host as unknown as Socket, { nickname: "Again", settings, bestOf: 1 })
    expect(context.host.events.at(-1)).toMatchObject({ event: "room_error" })
    expect(context.manager.getRoomStats().count).toBe(1)

    context.manager.roundTimeExpired(context.host as unknown as Socket, { roomId: context.created.roomId })
    context.manager.roundTimeExpired(guest as unknown as Socket, { roomId: context.created.roomId })
    const room = latestRoom(context.io, "round_ended")
    expect(room.status).toBe("playing")
    expect(room.currentRound).toBe(1)
    expect(room.winner).toBeUndefined()
    expect(room.roundDeadline).toBeNull()

    vi.advanceTimersByTime(20_000)
    const replay = latestRoom(context.io, "next_round_started")
    expect(replay.currentRound).toBe(1)
    expect(replay.roundDeadline).toBe(Date.now() + 1000)
  })

  it("accepts a guess during the network grace window", () => {
    vi.useFakeTimers()
    const context = setup(1)
    joinAndStart(context)

    vi.advanceTimersByTime(1001)
    const result = context.manager.makeGuess(context.host as unknown as Socket, {
      roomId: context.created.roomId,
      songId: song.id,
    })

    expect(result.ok).toBe(true)
    expect(latestRoom(context.io, "round_ended").winner).toBe(context.created.playerId)
  })

  it("keeps roundsWon, player score, and participant score consistent on forfeit", () => {
    vi.useFakeTimers()
    const context = setup(3)
    const { guest } = joinAndStart(context)
    context.manager.leaveRoom(guest as unknown as Socket, { roomId: context.created.roomId })

    const room = latestRoom(context.io, "round_ended")
    const winnerId = context.created.playerId
    expect(room.winner).toBe(winnerId)
    expect(room.roundsWon[winnerId]).toBe(2)
    expect(room.players[winnerId].score).toBe(2)
    expect(room.allParticipants[winnerId].score).toBe(2)
  })

  it("caps unlimited matches at ten minutes and installs a finished-room TTL", () => {
    vi.useFakeTimers()
    const context = setup(1, { ...settings, timeLimit: 0 })
    joinAndStart(context)

    vi.advanceTimersByTime(10 * 60_000 - 1)
    expect(context.manager.getRoomStats().count).toBe(1)

    vi.advanceTimersByTime(1)
    const expiredMatch = latestRoom(context.io, "round_ended") as MultiplayerRoom & { matchDeadline: number }
    expect(expiredMatch.status).toBe("finished")
    expect(expiredMatch.roundSettled).toBe(true)
    expect(expiredMatch.matchDeadline).toBe(Date.now())
    expect(context.manager.getRoomStats().count).toBe(1)

    vi.advanceTimersByTime(5 * 60_000)
    expect(context.manager.getRoomStats().count).toBe(0)
  })

  it("sends candidates only in initial and restored snapshots", () => {
    vi.useFakeTimers()
    const context = setup()
    expect(context.created.room.filteredSongs).toEqual([song])

    const { joined } = joinAndStart(context)
    expect(joined.room.filteredSongs).toEqual([song])
    expect(latestRoom(context.io, "game_started")).not.toHaveProperty("filteredSongs")

    context.manager.makeGuess(context.host as unknown as Socket, { roomId: context.created.roomId, songId: song.id })
    expect(latestRoom(context.io, "game_updated")).not.toHaveProperty("filteredSongs")

    context.manager.handleDisconnect(context.host as unknown as Socket)
    const replacement = new FakeSocket("candidate-replacement", context.io)
    context.manager.reconnectSession(replacement as unknown as Socket, { sessionToken: context.created.sessionToken })
    const restored = replacement.events.find((entry) => entry.event === "reconnected")!.payload
    expect(restored.room.filteredSongs).toEqual([song])
  })

  it("automatically starts the next round after twenty seconds", () => {
    vi.useFakeTimers()
    const context = setup(3, { ...settings, timeLimit: 0 })
    joinAndStart(context)

    context.manager.makeGuess(context.host as unknown as Socket, { roomId: context.created.roomId, songId: song.id })
    const ended = latestRoom(context.io, "round_ended") as MultiplayerRoom & { nextRoundDeadline: number }
    expect(ended.nextRoundDeadline).toBe(Date.now() + 20_000)

    vi.advanceTimersByTime(19_999)
    expect(context.io.events.filter((entry) => entry.event === "next_round_started")).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(latestRoom(context.io, "next_round_started").currentRound).toBe(2)
  })

  it("stops the round timer when every player gives up", () => {
    vi.useFakeTimers()
    const context = setup(3, { ...settings, timeLimit: 30 })
    const { guest } = joinAndStart(context)

    context.manager.giveUp(context.host as unknown as Socket, { roomId: context.created.roomId })
    expect(context.io.events.filter((entry) => entry.event === "round_ended")).toHaveLength(0)
    context.manager.giveUp(guest as unknown as Socket, { roomId: context.created.roomId })

    const ended = latestRoom(context.io, "round_ended")
    expect(ended.roundSettled).toBe(true)
    expect(ended.roundDeadline).toBeNull()
    expect(ended.nextRoundDeadline).toBe(Date.now() + 20_000)

    vi.advanceTimersByTime(20_000)
    expect(latestRoom(context.io, "next_round_started").currentRound).toBe(1)
  })

  it("keeps disconnected sessions for sixty seconds", () => {
    vi.useFakeTimers()
    const context = setup()
    context.manager.handleDisconnect(context.host as unknown as Socket)

    vi.advanceTimersByTime(59_999)
    const replacement = new FakeSocket("late-replacement", context.io)
    context.manager.reconnectSession(replacement as unknown as Socket, { sessionToken: context.created.sessionToken })
    expect(replacement.events.some((entry) => entry.event === "reconnected")).toBe(true)
  })

  it("notifies clients when an idle waiting room expires", () => {
    vi.useFakeTimers()
    const context = setup()

    vi.advanceTimersByTime(30 * 60_000)
    expect(context.io.events).toContainEqual(expect.objectContaining({
      target: context.host.id,
      event: "room_expired",
      payload: expect.objectContaining({ roomId: context.created.roomId }),
    }))
    expect(context.manager.getRoomStats().count).toBe(0)
  })

  it("cancels readiness on disconnect and requires every player online before starting", () => {
    vi.useFakeTimers()
    const context = setup()
    const guest = new FakeSocket("guest-socket", context.io)
    context.manager.joinRoom(guest as unknown as Socket, { roomId: context.created.roomId, nickname: "Guest" })
    const joined = guest.events.find((entry) => entry.event === "room_joined")!.payload
    context.manager.toggleReady(guest as unknown as Socket, { roomId: context.created.roomId })

    context.manager.handleDisconnect(guest as unknown as Socket)
    const disconnectedRoom = latestRoom(context.io, "player_disconnected")
    expect(disconnectedRoom.players[joined.playerId]).toMatchObject({ online: false, isReady: false })
    context.manager.startGame(context.host as unknown as Socket, { roomId: context.created.roomId })
    expect(context.host.events.at(-1)?.payload.message).toContain("重新连线")

    const replacement = new FakeSocket("replacement", context.io)
    context.manager.reconnectSession(replacement as unknown as Socket, { sessionToken: joined.sessionToken })
    const reconnected = replacement.events.find((entry) => entry.event === "reconnected")!.payload
    expect(reconnected.room.players[joined.playerId]).toMatchObject({ online: true, isReady: false })
    context.manager.toggleReady(replacement as unknown as Socket, { roomId: context.created.roomId })
    context.manager.startGame(context.host as unknown as Socket, { roomId: context.created.roomId })
    expect(latestRoom(context.io, "game_started").status).toBe("playing")
  })

  it("ignores draws and finishes only after a player reaches the target wins", () => {
    vi.useFakeTimers()
    const context = setup(3, { ...settings, timeLimit: 0 })
    const { guest } = joinAndStart(context)

    context.manager.makeGuess(context.host as unknown as Socket, { roomId: context.created.roomId, songId: song.id })
    context.manager.readyNextRound(context.host as unknown as Socket, { roomId: context.created.roomId })
    context.manager.readyNextRound(guest as unknown as Socket, { roomId: context.created.roomId })
    context.manager.giveUp(context.host as unknown as Socket, { roomId: context.created.roomId })
    context.manager.giveUp(guest as unknown as Socket, { roomId: context.created.roomId })
    const draw = latestRoom(context.io, "round_ended")
    expect(draw.status).toBe("playing")
    expect(draw.currentRound).toBe(2)
    expect(draw.roundDeadline).toBeNull()
    context.manager.readyNextRound(context.host as unknown as Socket, { roomId: context.created.roomId })
    context.manager.readyNextRound(guest as unknown as Socket, { roomId: context.created.roomId })
    expect(latestRoom(context.io, "next_round_started").currentRound).toBe(2)
    context.manager.makeGuess(context.host as unknown as Socket, { roomId: context.created.roomId, songId: song.id })

    const finished = latestRoom(context.io, "round_ended")
    expect(finished.status).toBe("finished")
    expect(finished.currentRound).toBe(2)
    expect(finished.winner).toBe(context.created.playerId)

    context.manager.handleDisconnect(context.host as unknown as Socket)
    const replacement = new FakeSocket("finished-replacement", context.io)
    context.manager.reconnectSession(replacement as unknown as Socket, { sessionToken: context.created.sessionToken })
    expect(replacement.events.find((entry) => entry.event === "reconnected")!.payload.room.status).toBe("finished")
  })

  it("uses only the room-code alphabet when the primary generator collides", () => {
    vi.useFakeTimers()
    const random = vi.spyOn(Math, "random").mockReturnValue(0)
    const context = setup()
    const second = new FakeSocket("second-host", context.io)
    context.manager.createRoom(second as unknown as Socket, { nickname: "Second", settings, bestOf: 3 })
    const roomId = second.events.find((entry) => entry.event === "room_created")!.payload.roomId
    expect(roomId).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    expect(roomId).not.toBe(context.created.roomId)
    random.mockRestore()
  })
})
