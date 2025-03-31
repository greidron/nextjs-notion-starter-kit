import { NextApiRequest } from "next"
import { Session } from "next-auth"
import { ResponseFunctionToolCall, ResponseInputItem } from 'openai/resources/responses/responses.mjs';

export interface AgentUser {
  id: string
  provider: string
  name?: string | null
  email?: string | null
  image?: string | null
}

export const AgentType = {
  OPEN_AI: 'openai'
} as const
export type AgentType = typeof AgentType[keyof typeof AgentType]

export interface AgentTokenUsage {
  total: number
  input: number
  output: number
}

export type AgentToolUsage = { [key: string]: number }

export interface AgentInfo {
  type?: AgentType
  id?: string
  model?: string
  tokenUsage?: AgentTokenUsage
  toolUsage?: AgentToolUsage
}

export interface AgentToolInfo {
  type: string
  status: AgentToolStatus
}

export const AgentEvent = {
  BEGIN: 'begin',
  END: 'end',
  TOOL: 'tool',
  ADD: 'add',
  DELTA: 'delta',
  FINALIZE: 'finalize',
  INFO: 'info',
  ERROR: 'error',
} as const
export type AgentEvent = typeof AgentEvent[keyof typeof AgentEvent]

export const AgentContentType = {
  TEXT: 'text',
  MEDIA: 'media',
} as const
export type AgentContentType = typeof AgentContentType[keyof typeof AgentContentType]

export interface AgentResponse {
  event: AgentEvent
  content?: string
  contentType?: AgentContentType
  contentIndex?: number
  errorMessage?: string
  tool?: AgentToolInfo
  info?: AgentInfo
  timestamp?: number
}

export const AgentMessageType = {
  SYSTEM: 'system',
  AGENT: 'agent',
  USER: 'user',
} as const
export type AgentMessageType = typeof AgentMessageType[keyof typeof AgentMessageType]

export interface AgentMessage {
  type: AgentMessageType
  content: string
  contentType?: AgentContentType
  contentIndex?: number
  info?: AgentInfo
  timestamp?: number
}

export interface AgentContext {
  id: string
  outputId?: string
  messages?: AgentMessage[]
  processingMessages?: AgentMessage[]
  info?: AgentInfo
  error?: any
  lastContentIndex?: number
  timestamp?: number
  isStopProcessing?: boolean
  toolUsage?: AgentToolUsage
}

export type OpenAiAgentToolMessage = ResponseFunctionToolCall | ResponseInputItem.FunctionCallOutput

export interface OpenAiAgentContext extends AgentContext {
  toolMessages?: OpenAiAgentToolMessage[]
  isFunctionCalling?: boolean
}

export const AgentChatPageStatus = {
  INIT: 'init',
  LOADING: 'loading',
  READY: 'ready',
  PROCESSING: 'processing'
} as const
export type AgentChatPageStatus = typeof AgentChatPageStatus[keyof typeof AgentChatPageStatus]

export interface AgentApiRequest extends NextApiRequest {
  session: AgentSession
}

export interface AgentSession extends Session {
  id: string
}

export const AgentToolStatus = {
  PREPARE: 'prepare',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  UNKNOWN: 'unknown',
} as const
export type AgentToolStatus = typeof AgentToolStatus[keyof typeof AgentToolStatus]

export type AgentToolStatusMap = { [key: string]: AgentToolStatus }

export interface SummaryInputMessage {
  user?: string
  agent?: string
  timestamp?: number
}

export interface AgentMemoryItem {
  content?: string
  tags?: string[]
  startTimestamp?: number
  endTimestamp?: number
}

export interface AgentMemory {
  memoryItems?: AgentMemoryItem[]
}

export interface AgentMeteringItem {
  tokenUsage?: AgentTokenUsage
  toolUsage?: AgentToolUsage
  startTimestamp?: number
  endTimestamp?: number
}

export interface AgentMetering {
  meteringItems?: AgentMeteringItem[]
}

export type Function<T, R> = (arg: T) => R

export type UnaryOperator<T> = Function<T, T>