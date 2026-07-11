export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'needs_human_review'
  | 'resolved'
  | 'closed'

export interface Ticket {
  id: number
  userId: string
  orgId: string
  status: TicketStatus
  priority: string
  title: string
  description: string
  customer: string
  assignedAgent: string | null
  assignedTo: string | null
  confidence: number | null
  aiDraft: string | null
  aiDraftApproved: boolean | null
  finalResponse: string | null
  createdAt: Date
  updatedAt: Date | null
}

export interface KBItem {
  id: number
  userId: string
  orgId: string
  title: string
  content: string
  category: string | null
  tags: string | null
  createdAt: Date
  updatedAt: Date
}