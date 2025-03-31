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

export interface AgentInfo {
  type: AgentType
  id: string
  model: string
}

export const AgentEvent = {
  BEGIN: 'begin',
  END: 'end',
  TOOL: 'tool',
  DELTA: 'delta',
  FINALIZE: 'finalize',
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
  contentType?: AgentContentType
  contentIndex?: number
  content?: string
  errorMessage?: string
  info?: AgentInfo
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
  contentIndex?: number
  info?: AgentInfo
}

export interface AgentContext {
  id: string
  messages?: AgentMessage[],
  info?: AgentInfo
}

export const AgentChatPageStatus = {
  INIT: 'init',
  LOADING: 'loading',
  READY: 'ready',
  PROCESSING: 'processing'
} as const
export type AgentChatPageStatus = typeof AgentChatPageStatus[keyof typeof AgentChatPageStatus]