import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { 
  MessageCircle, Mail, Phone, MessageSquare, Search, 
  Plus, Send, Archive, Trash2, Filter, Star, 
  ChevronLeft, MoreVertical, Check, Clock
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { 
  ClientThread, Message, MessageTemplate, getThreads, 
  getThreadWithMessages, sendMessage, markThreadAsRead,
  getTemplates, getThreadStats, searchThreads, updateThreadStatus
} from '../lib/inbox'

const channelIcons: Record<string, any> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  call: Phone
}

const channelColors: Record<string, string> = {
  email: 'bg-red-100 text-red-600',
  whatsapp: 'bg-green-100 text-green-600',
  sms: 'bg-orange-100 text-orange-600',
  call: 'bg-green-100 text-green-600'
}

export default function Inbox() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ClientThread[]>([])
  const [selectedThread, setSelectedThread] = useState<ClientThread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [stats, setStats] = useState({ total: 0, unread: 0, byChannel: {} as Record<string, number> })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  async function loadData() {
    if (!user) return
    try {
      const [threadsData, templatesData, statsData] = await Promise.all([
        getThreads(user.id),
        getTemplates(user.id),
        getThreadStats(user.id)
      ])
      setThreads(threadsData)
      setTemplates(templatesData)
      setStats(statsData)
    } catch (error: any) {
      console.error('Error loading inbox data:', error)
      toast.error(error.message || 'Failed to load inbox data')
    } finally {
      setLoading(false)
    }
  }

  async function loadThread(thread: ClientThread) {
    try {
      const { thread: threadData, messages: msgs } = await getThreadWithMessages(thread.id)
      setSelectedThread(threadData)
      setMessages(msgs)
      if (thread.unread_count > 0) {
        await markThreadAsRead(thread.id)
        setThreads(prev => prev.map(t => 
          t.id === thread.id ? { ...t, unread_count: 0 } : t
        ))
        setStats(prev => ({ ...prev, unread: prev.unread - thread.unread_count }))
      }
    } catch (error) {
      console.error('Error loading thread:', error)
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedThread) return
    setSending(true)
    try {
      const message = await sendMessage({
        thread_id: selectedThread.id,
        direction: 'outbound',
        channel: selectedThread.channel,
        content: newMessage,
        status: 'sent'
      })
      setMessages(prev => [...prev, message])
      setNewMessage('')
      // Update thread in list
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id ? {
          ...t,
          last_message_at: new Date().toISOString(),
          last_message_preview: newMessage.substring(0, 100)
        } : t
      ))
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  async function handleSearch() {
    if (!user || !searchQuery.trim()) {
      const threadsData = await getThreads(user!.id)
      setThreads(threadsData)
      return
    }
    try {
      const results = await searchThreads(user.id, searchQuery)
      setThreads(results)
    } catch (error) {
      console.error('Error searching:', error)
    }
  }

  async function handleArchive(thread: ClientThread) {
    try {
      await updateThreadStatus(thread.id, 'archived')
      setThreads(prev => prev.filter(t => t.id !== thread.id))
      if (selectedThread?.id === thread.id) {
        setSelectedThread(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error archiving:', error)
    }
  }

  async function handleNewThread(clientName: string, clientEmail: string, clientPhone: string, channel: string) {
    if (!user) return
    try {
      const thread = await createThread({
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        channel,
        status: 'active'
      })
      setThreads(prev => [thread, ...prev])
      setSelectedThread(thread)
      setMessages([])
      setShowCompose(false)
    } catch (error: any) {
      console.error('Error creating thread:', error)
      toast.error(error.message || 'Failed to create conversation')
    }
  }

  function useTemplate(content: string) {
    setNewMessage(content)
    setShowTemplates(false)
  }

  const filteredThreads = filter 
    ? threads.filter(t => t.channel === filter)
    : threads

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Thread List */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 ${selectedThread ? 'hidden lg:flex' : 'flex'} w-full lg:w-80`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <button
              onClick={() => setShowCompose(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-gray-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="flex-1 bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{stats.unread}</div>
              <div className="text-xs text-blue-500">Unread</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1 mt-3">
            {['email', 'whatsapp', 'sms'].map(ch => (
              <button
                key={ch}
                onClick={() => setFilter(filter === ch ? null : ch)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === ch 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle size={40} className="mx-auto mb-2 text-gray-300" />
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredThreads.map(thread => {
                const Icon = channelIcons[thread.channel] || MessageCircle
                return (
                  <motion.div
                    key={thread.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => loadThread(thread)}
                    className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedThread?.id === thread.id 
                        ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${channelColors[thread.channel] || 'bg-gray-100'}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm ${thread.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {thread.client_name}
                          </span>
                          {thread.unread_count > 0 && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {thread.last_message_preview || 'No messages yet'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {thread.last_message_at 
                              ? new Date(thread.last_message_at).toLocaleDateString() 
                              : 'New'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Message View */}
      <div className={`flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 ${!selectedThread ? 'hidden lg:flex' : 'flex'}`}>
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedThread(null); setMessages([]) }}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedThread.client_name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedThread.client_email || selectedThread.client_phone || 'No contact info'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleArchive(selectedThread)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  <Star size={18} />
                </button>
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${
                      msg.direction === 'outbound'
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    } px-4 py-3`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${
                        msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        <Clock size={12} />
                        {new Date(msg.created_at).toLocaleString()}
                        {msg.direction === 'outbound' && (
                          <span className="ml-2">
                            {msg.status === 'read' ? <Check size={14} className="text-green-300" /> : 
                             msg.status === 'delivered' ? <Check size={14} /> : null}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Compose */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="p-3 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Templates"
                  >
                    <Filter size={20} />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>

              {/* Templates Dropdown */}
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-20 right-8 w-80 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto"
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 px-2 py-1">Quick Templates</div>
                      {templates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => useTemplate(template.content)}
                          className="w-full text-left px-2 py-2 hover:bg-gray-50 rounded-lg"
                        >
                          <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500 truncate">{template.content}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a conversation</p>
              <p className="text-sm">or start a new one</p>
              <button
                onClick={() => setShowCompose(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">New Conversation</h3>
              <ComposeForm onSubmit={handleNewThread} onCancel={() => setShowCompose(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComposeForm({ onSubmit, onCancel }: { onSubmit: (name: string, email: string, phone: string, channel: string) => void, onCancel: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState('email')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(name, email, phone, channel)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="john@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+91 98765 43210"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
        <div className="flex gap-2">
          {['email', 'whatsapp', 'sms'].map(ch => (
            <button
              key={ch}
              type="button"
              onClick={() => setChannel(ch)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-colors ${
                channel === ch 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Conversation
        </button>
      </div>
    </form>
  )
}

// Also export createThread for the compose form
async function createThread(thread: Partial<ClientThread>): Promise<ClientThread> {
  const { data, error } = await supabase
    .from('client_threads')
    .insert(thread)
    .select()
    .single()

  if (error) throw error
  return data
}
