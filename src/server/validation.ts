import { z } from "zod"
import { parseLevelBand } from "../shared/domain/levels"
import { VERSION_ORDER } from "../shared/domain/versions"
import type { BestOf, VersionName } from "../shared/types"

const versionSchema = z.enum(VERSION_ORDER as unknown as [VersionName, ...VersionName[]], {
  message: "未知的游戏版本",
})

const levelSchema = z.string().regex(/^(?:[1-9]|1[0-5])\+?$/, "无效的等级")
const roomIdSchema = z.string().trim().regex(/^[A-Z2-9]{6}$/i, "无效的房间号").transform((value) => value.toUpperCase())
const nicknameSchema = z.string().trim().min(1, "昵称不能为空").max(24, "昵称不能超过 24 个字符")
const dailySessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,100}$/, "无效的每日会话令牌")

const settingsSchema = z.object({
  versionRange: z.object({
    min: versionSchema,
    max: versionSchema,
  }),
  genres: z.array(z.string().trim().min(1).max(40)).max(20),
  masterLevelRange: z.object({
    min: levelSchema,
    max: levelSchema,
  }),
  maxGuesses: z.number().int().min(1).max(100),
  topSongs: z.number().int().min(1).max(10000),
  timeLimit: z.number().int().min(0).max(3600),
}).strict().superRefine((settings, context) => {
  if (VERSION_ORDER.indexOf(settings.versionRange.min) > VERSION_ORDER.indexOf(settings.versionRange.max)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["versionRange"], message: "版本范围无效" })
  }
  if (parseLevelBand(settings.masterLevelRange.min) > parseLevelBand(settings.masterLevelRange.max)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["masterLevelRange"], message: "等级范围无效" })
  }
})

const bestOfSchema = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(5),
  z.literal(7),
  z.literal(9),
]) satisfies z.ZodType<BestOf>

export const socketSchemas = {
  createRoom: z.object({
    nickname: nicknameSchema,
    settings: settingsSchema,
    bestOf: bestOfSchema,
    isPublic: z.boolean().optional(),
  }).strict(),
  joinRoom: z.object({ roomId: roomIdSchema, nickname: nicknameSchema }).strict(),
  reconnectSession: z.object({ sessionToken: z.string().min(16).max(200) }).strict(),
  joinRandomRoom: z.object({ nickname: nicknameSchema }).strict(),
  room: z.object({ roomId: roomIdSchema }).strict(),
  removePlayer: z.object({ roomId: roomIdSchema, playerId: z.string().min(1).max(100) }).strict(),
  makeGuess: z.object({ roomId: roomIdSchema, songId: z.number().int().nonnegative() }).strict(),
}

export const dailySchemas = {
  restore: z.object({ sessionToken: dailySessionTokenSchema.optional() }).strict(),
  guess: z.object({ sessionToken: dailySessionTokenSchema, songId: z.number().int().nonnegative() }).strict(),
  giveUp: z.object({ sessionToken: dailySessionTokenSchema }).strict(),
}
