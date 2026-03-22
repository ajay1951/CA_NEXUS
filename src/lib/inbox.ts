import { supabase } from './supabase'

// Types for Universal Inbox
export interface CommunicationChannel {
  id: string
  name: string
  type: string
  icon: string
  color: string
  is_active: boolean
}

export interface ClientThread {
  id: string
  user_id: string
  lead_id?: string
  client_name: string
  client_email?: string
  client_phone?: string
  channel: string
  external_thread_id?: string
  status: string
  last_message_at?: string
  last_message_preview?: string
  unread_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  direction: 'inbound' | 'outbound'
  channel: string
  content: string
  sender_name?: string
  sender_identifier?: string
  recipient_name?: string
  recipient_identifier?: string
  metadata?: Record<string, any>
  external_message_id?: string
  status: string
  created_at: string
  read_at?: string
}

export interface MessageTemplate {
  id: string
  user_id?: string
  name: string
  content: string
  channel: string
  category?: string
  is_public: boolean
}

// Get all communication channels
export async function getChannels(): Promise<CommunicationChannel[]> {
  const { data, error } = await supabase
    .from('communication_channels')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

// Get all threads for current user
export async function getThreads(userId: string): Promise<ClientThread[]> {
  const { data, error } = await supabase
    .from('client_threads')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Get single thread with messages
export async function getThreadWithMessages(threadId: string): Promise<{ thread: ClientThread; messages: Message[] }> {
  const [threadResult, messagesResult] = await Promise.all([
    supabase
      .from('client_threads')
      .select('*')
      .eq('id', threadId)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
  ])

  if (threadResult.error) throw threadResult.error
  if (messagesResult.error) throw messagesResult.error

  return {
    thread: threadResult.data,
    messages: messagesResult.data || []
  }
}

// Create new thread
export async function createThread(thread: Partial<ClientThread>): Promise<ClientThread> {
  const { data, error } = await supabase
    .from('client_threads')
    .insert(thread)
    .select()
    .single()

  if (error) throw error
  return data
}

// Send message
export async function sendMessage(message: Partial<Message>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()

  if (error) throw error

  // Update thread's last message
  if (message.thread_id) {
    await supabase
      .from('client_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.content?.substring(0, 100),
        updated_at: new Date().toISOString()
      })
      .eq('id', message.thread_id)
  }

  return data
}

// Mark thread as read
export async function markThreadAsRead(threadId: string): Promise<void> {
  await supabase
    .from('client_threads')
    .update({ unread_count: 0 })
    .eq('id', threadId)

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
      .is('read_at', null)
}

// Get message templates
export async function getTemplates(userId?: string): Promise<MessageTemplate[]> {
  let query = supabase
    .from('message_templates')
    .select('*')
    .order('name')

  if (userId) {
    query = query.or(`user_id.eq.${userId},is_public.eq.true`)
  } else {
    query = query.eq('is_public', true)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Create message template
export async function createTemplate(template: Partial<MessageTemplate>): Promise<MessageTemplate> {
  const { data, error } = await supabase
    .from('message_templates')
    .insert(template)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get thread statistics
export async function getThreadStats(userId: string): Promise<{
  total: number
  unread: number
  byChannel: Record<string, number>
}> {
  const { data: threads, error } = await supabase
    .from('client_threads')
    .select('unread_count, channel, status')
    .eq('user_id', userId)

  if (error) throw error

  const total = threads?.length || 0
  const unread = threads?.reduce((sum, t) => sum + (t.unread_count || 0), 0) || 0
  const byChannel: Record<string, number> = {}

  threads?.forEach(t => {
    byChannel[t.channel] = (byChannel[t.channel] || 0) + 1
  })

  return { total, unread, byChannel }
}

// Search threads
export async function searchThreads(userId: string, query: string): Promise<ClientThread[]> {
  const { data, error } = await supabase
    .from('client_threads')
    .select('*')
    .eq('user_id', userId)
    .or(`client_name.ilike.%${query}%,client_email.ilike.%${query}%,last_message_preview.ilike.%${query}%`)
    .order('last_message_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Update thread status
export async function updateThreadStatus(threadId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('client_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId)

  if (error) throw error
}

// Delete thread
export async function deleteThread(threadId: string): Promise<void> {
  const { error } = await supabase
    .from('client_threads')
    .delete()
    .eq('id', threadId)

  if (error) throw error
}
