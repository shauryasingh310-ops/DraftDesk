import { pgTable, text, timestamp, boolean, integer, serial, vector, real, uniqueIndex } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- Multi-tenant org tables (Option B: lightweight custom tenancy) --------

// Organizations: each tenant gets its own isolated dataset.
export const organization = pgTable('organization', {
  id: text('id').primaryKey(), // uuid
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // short id used in invite links
  joinPass: text('joinPass'), // optional pass required to join
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Membership: links a user to one or more organizations.
export const membership = pgTable(
  'membership',
  {
    id: serial('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgId: text('orgId')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // member | admin
    createdAt: timestamp('createdAt').notNull().defaultNow(),
  },
  table => ({
    unq: uniqueIndex('membership_user_org_unq').on(table.userId, table.orgId),
  }),
)

// --- App tables - SupportCopilot -------------------------------------------

// Tickets: Support requests
export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(), // org member who created/owns this
  orgId: text('orgId').notNull(), // tenant isolation
  status: text('status').notNull().default('open'), // open, in_progress, resolved, closed
  priority: text('priority').notNull().default('medium'), // low, medium, high, urgent
  title: text('title').notNull(),
  description: text('description').notNull(),
  customer: text('customer').notNull(), // customer name/email
  assignedAgent: text('assignedAgent'), // legacy, unused — kept for backward compat
  assignedTo: text('assignedTo').references(() => user.id, { onDelete: 'set null' }), // agent the ticket is assigned to
  confidence: real('confidence'), // retrieval confidence (0–1) from last draft generation
  aiDraft: text('aiDraft'), // AI generated draft response (if any)
  aiDraftApproved: boolean('aiDraftApproved').default(false),
  finalResponse: text('finalResponse'), // approved response or manual response
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Knowledge base articles
export const knowledgeBase = pgTable('knowledgeBase', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  tags: text('tags'), // comma-separated
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Chunks for RAG: split knowledge base articles into manageable pieces
export const chunks = pgTable('chunks', {
  id: serial('id').primaryKey(),
  orgId: text('orgId').notNull(),
  kbId: integer('kbId').notNull(), // references knowledgeBase.id (no FK for schema flexibility)
  text: text('text').notNull(), // the chunk content
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI embedding vector
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

// Activity log for audit trail and debugging
export const activityLog = pgTable('activityLog', {
  id: serial('id').primaryKey(),
  userId: text('userId').notNull(),
  orgId: text('orgId').notNull(),
  action: text('action').notNull(), // ticket_created, ticket_updated, ai_draft_generated, etc.
  ticketId: integer('ticketId'),
  metadata: text('metadata'), // JSON string for additional context
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})
