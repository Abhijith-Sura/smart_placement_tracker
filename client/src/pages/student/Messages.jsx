import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Search, Loader2, MessageSquare, User as UserIcon, 
  Video, Phone, Users, Plus, X, Info, Settings, ShieldAlert, 
  LogOut, Check, Calendar, Activity, BarChart3, BarChart, HelpCircle
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import API from '../../api/axios'
import { useSocket } from '../../hooks/useSocket'
import AppLayout from '../../components/layout/AppLayout'
import toast from 'react-hot-toast'

const Messages = () => {
  const { user } = useAuth()
  const { socket } = useSocket()

  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // Contacts directory
  const [contacts, setContacts] = useState([])
  const [showContactSelector, setShowContactSelector] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  // Group creation & member manager
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)

  // New WhatsApp-like features
  const [showPollModal, setShowPollModal] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', '']) // Default 2 options
  const [selectedSeenInfoMessage, setSelectedSeenInfoMessage] = useState(null)

  const messagesEndRef = useRef(null)

  // Resolve roles & IDs
  const myId = user?.user?._id || user?._id || ''
  const myRole = user?.user?.role || user?.role || ''
  const myName = user?.user?.name || user?.name || ''
  const userIsAdmin = myRole === 'admin'

  // Load chat rooms on mount & auto-select first room
  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true)
      try {
        const { data } = await API.get('/chat/rooms')
        const list = data.rooms || []
        setRooms(list)
        if (list.length > 0 && !activeRoom) {
          setActiveRoom(list[0])
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          toast.error('Could not load conversations')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchRooms()
  }, [])

  // Load chat contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const { data } = await API.get('/chat/contacts')
        setContacts(data.contacts || [])
      } catch (err) {
        console.error('Failed to load eligible contacts:', err.message)
      }
    }
    fetchContacts()
  }, [rooms]) // Reload contacts when rooms change to keep "New Chat" directory filtered

  // Load messages when room selected
  useEffect(() => {
    if (!activeRoom) return
    const fetchMessages = async () => {
      try {
        const { data } = await API.get(`/chat/${activeRoom._id}`)
        setMessages(data.messages || [])
        if (data.room) {
          setActiveRoom(data.room)
        }
        scrollToBottom()
      } catch (err) {
        toast.error('Failed to load messages')
      }
    }
    fetchMessages()
  }, [activeRoom?._id])

  // Socket listeners
  useEffect(() => {
    if (!socket) return

    const handleReceive = ({ message }) => {
      if (activeRoom && message.roomId === activeRoom._id) {
        // Double check to prevent duplicates
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom()
      }
      setRooms(prev => {
        const exists = prev.some(r => r._id === message.roomId);
        if (!exists) {
          API.get('/chat/rooms').then(({ data }) => setRooms(data.rooms || []));
          return prev;
        }
        return prev.map(r => r._id === message.roomId ? { ...r, lastMessage: message } : r);
      })
    }

    const handleTyping = ({ senderId, isTyping: typing }) => {
      const otherUser = getOtherUser(activeRoom)
      if (activeRoom && senderId === otherUser?._id) setOtherUserTyping(typing)
    }

    const handleGroupCreated = ({ room }) => {
      setRooms(prev => {
        const exists = prev.some(r => r._id === room._id);
        if (!exists) return [room, ...prev];
        return prev;
      });
    };

    const handleGroupUpdated = ({ room }) => {
      setRooms(prev => prev.map(r => r._id === room._id ? room : r));
      if (activeRoom && activeRoom._id === room._id) {
        setActiveRoom(room);
      }
    };

    const handleMeetingToggled = ({ room }) => {
      setRooms(prev => prev.map(r => r._id === room._id ? room : r));
      if (activeRoom && activeRoom._id === room._id) {
        setActiveRoom(room);
        if (room.meetingActive) {
          toast.success('Live video meeting started!')
        }
      }
    };

    // Real-time WhatsApp ticks update
    const handleMessagesRead = ({ roomId, userId, messageIds }) => {
      if (activeRoom && activeRoom._id === roomId) {
        setMessages(prev => prev.map(m => {
          if (messageIds.includes(m._id)) {
            const hasRead = m.readBy?.some(r => (r.userId?._id || r.userId) === userId);
            if (!hasRead) {
              return {
                ...m,
                readBy: [...(m.readBy || []), { userId: { _id: userId }, readAt: new Date() }]
              };
            }
          }
          return m;
        }));
      }
    };

    // Real-time Poll updates
    const handlePollUpdated = ({ message }) => {
      if (activeRoom && message.roomId === activeRoom._id) {
        setMessages(prev => prev.map(m => m._id === message._id ? message : m));
      }
    };

    socket.on('chat:receive_message', handleReceive)
    socket.on('chat:typing', handleTyping)
    socket.on('chat:group_created', handleGroupCreated)
    socket.on('chat:group_updated', handleGroupUpdated)
    socket.on('chat:meeting_toggled', handleMeetingToggled)
    socket.on('chat:messages_read', handleMessagesRead)
    socket.on('chat:poll_updated', handlePollUpdated)

    return () => {
      socket.off('chat:receive_message', handleReceive)
      socket.off('chat:typing', handleTyping)
      socket.off('chat:group_created', handleGroupCreated)
      socket.off('chat:group_updated', handleGroupUpdated)
      socket.off('chat:meeting_toggled', handleMeetingToggled)
      socket.off('chat:messages_read', handleMessagesRead)
      socket.off('chat:poll_updated', handlePollUpdated)
    }
  }, [socket, activeRoom])

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }

  const getOtherUser = (room) => {
    if (!room || room.isGroup) return {}
    return room.participants?.find(p => (p._id || p) !== myId) || room.participants?.[0] || {}
  }

  // Check if I am a group admin in the active room
  const isMeGroupAdmin = () => {
    if (!activeRoom || !activeRoom.isGroup) return false
    return activeRoom.groupAdmins?.some(admin => (admin._id || admin) === myId)
  }

  // Ticks calculator
  const getMessageReadStatus = (msg) => {
    if (!activeRoom) return 'sent'
    if ((msg.senderId?._id || msg.senderId) !== myId) return 'received'

    const otherParticipants = activeRoom.participants?.filter(p => (p._id || p) !== myId) || []
    
    if (activeRoom.isGroup) {
      const otherReaders = msg.readBy?.filter(r => (r.userId?._id || r.userId) !== myId) || []
      const readByAll = otherParticipants.every(p => 
        otherReaders.some(r => (r.userId?._id || r.userId) === p._id)
      )
      return readByAll ? 'read' : 'delivered'
    } else {
      const otherUser = otherParticipants[0]
      if (!otherUser) return 'delivered'
      const hasRead = msg.readBy?.some(r => (r.userId?._id || r.userId) === otherUser._id)
      return hasRead ? 'read' : 'delivered'
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeRoom || sending) return
    const txt = newMessage.trim()
    setNewMessage('')
    setSending(true)
    try {
      const { data } = await API.post(`/chat/${activeRoom._id}`, { content: txt })
      // Use setMessages prev representation to avoid any socket race conditions
      setMessages(prev => {
        if (prev.some(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      setRooms(prev => prev.map(r => r._id === data.message.roomId ? { ...r, lastMessage: data.message } : r))
      scrollToBottom()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    if (!activeRoom || !socket || activeRoom.isGroup) return
    if (!isTyping) {
      setIsTyping(true)
      socket.emit('chat:typing', { receiverId: getOtherUser(activeRoom)._id, isTyping: true })
    }
    clearTimeout(window.__typingTimeout)
    window.__typingTimeout = setTimeout(() => {
      setIsTyping(false)
      socket.emit('chat:typing', { receiverId: getOtherUser(activeRoom)._id, isTyping: false })
    }, 1500)
  }

  const handleStartChat = async (targetUserId) => {
    try {
      const { data } = await API.post('/chat/start', { targetUserId })
      const existingRoom = rooms.find(r => r._id === data.room._id)
      if (!existingRoom) {
        setRooms(prev => [data.room, ...prev])
      }
      setActiveRoom(data.room)
      setShowContactSelector(false)
      setContactSearch('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start conversation')
    }
  }

  // Admin Group Creation
  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) return toast.error('Group name is required')
    if (selectedParticipants.length === 0) return toast.error('Select at least one member')

    try {
      const { data } = await API.post('/chat/groups', {
        groupName: groupName.trim(),
        participants: selectedParticipants
      })
      setRooms(prev => [data.room, ...prev])
      setActiveRoom(data.room)
      setShowGroupModal(false)
      setGroupName('')
      setSelectedParticipants([])
      toast.success('Group created successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group')
    }
  }

  // Admin Member Updates
  const handleUpdateMembers = async () => {
    try {
      const { data } = await API.post(`/chat/groups/${activeRoom._id}/members`, {
        participants: selectedParticipants
      })
      setActiveRoom(data.room)
      setRooms(prev => prev.map(r => r._id === data.room._id ? data.room : r))
      setShowManageMembers(false)
      toast.success('Group members updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update members')
    }
  }

  // Promote / Demote Group Admin privileges
  const handleToggleAdminStatus = async (targetUserId, action) => {
    try {
      const { data } = await API.post(`/chat/groups/${activeRoom._id}/admins`, {
        targetUserId,
        action
      })
      setActiveRoom(data.room)
      setRooms(prev => prev.map(r => r._id === data.room._id ? data.room : r))
      toast.success(action === 'promote' ? 'Promoted user to Group Admin!' : 'Dismissed Group Admin privileges.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update admin privileges')
    }
  }

  // Native Poll Creation
  const handleCreatePoll = async (e) => {
    e.preventDefault()
    if (!pollQuestion.trim()) return toast.error('Question is required')
    
    const validOptions = pollOptions.filter(o => o.trim())
    if (validOptions.length < 2) return toast.error('Add at least 2 options')

    try {
      const { data } = await API.post(`/chat/rooms/${activeRoom._id}/poll`, {
        question: pollQuestion.trim(),
        options: validOptions
      })
      setMessages(prev => [...prev, data.message])
      setShowPollModal(false)
      setPollQuestion('')
      setPollOptions(['', ''])
      scrollToBottom()
      toast.success('Poll created successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create poll')
    }
  }

  // Native Poll Vote toggling
  const handleVotePoll = async (messageId, optionId) => {
    try {
      const { data } = await API.post(`/chat/messages/${messageId}/vote`, { optionId })
      setMessages(prev => prev.map(m => m._id === messageId ? data.message : m))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register vote')
    }
  }

  const addPollOptionField = () => {
    if (pollOptions.length >= 5) return toast.error('Maximum 5 options allowed')
    setPollOptions(prev => [...prev, ''])
  }

  const handlePollOptionChange = (idx, value) => {
    setPollOptions(prev => prev.map((val, i) => i === idx ? value : val))
  }

  // Live Jitsi Video Meeting toggling
  const handleToggleMeeting = async (action) => {
    try {
      const { data } = await API.post(`/chat/rooms/${activeRoom._id}/meeting`, { action })
      setActiveRoom(data.room)
      setRooms(prev => prev.map(r => r._id === data.room._id ? data.room : r))
      if (action === 'start') {
        window.open(data.room.meetingLink, '_blank')
        toast.success('Meeting room opened in new tab!')
      } else {
        toast.success('Live meeting terminated.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle meeting')
    }
  }

  const toggleParticipantSelection = (id) => {
    setSelectedParticipants(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    )
  }

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(contactSearch.toLowerCase())
  )

  return (
    <AppLayout title="Messages" subtitle="Direct and group conversations with your team">
      <div
        className="flex h-[calc(100vh-7rem)] rounded-2xl overflow-hidden shadow-2xl relative"
        style={{ border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
      >

        {/* ── Sidebar: Conversations/Contacts ──────────────── */}
        <div
          className="w-80 flex flex-col flex-shrink-0 relative z-10"
          style={{ background: '#111827', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Header */}
          <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: '#f1f5f9' }}>
                {showContactSelector ? 'Select Contact' : 'Conversations'}
              </h2>
              <div className="flex items-center gap-1.5">
                {userIsAdmin && !showContactSelector && (
                  <button
                    onClick={() => {
                      setGroupName('')
                      setSelectedParticipants([])
                      setShowGroupModal(true)
                    }}
                    className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow shadow-indigo-600/10"
                    title="New Group"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setShowContactSelector(!showContactSelector)}
                  className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/20 transition-all"
                >
                  {showContactSelector ? 'Chats' : 'New Chat'}
                </button>
              </div>
            </div>
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
              <input
                type="text"
                placeholder={showContactSelector ? "Search contacts..." : "Search conversations..."}
                value={showContactSelector ? contactSearch : ""}
                onChange={(e) => showContactSelector ? setContactSearch(e.target.value) : null}
                className="w-full rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f1f5f9',
                }}
              />
            </div>
          </div>

          {/* List Section */}
          <div className="flex-1 overflow-y-auto">
            {showContactSelector ? (
              // Contact directory list (excludes users with active 1-to-1 rooms)
              filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <p className="text-xs font-bold text-slate-500">No eligible contacts found</p>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
                    {myRole === 'student' 
                      ? 'You can message Admins or Recruiters once shortlisted.' 
                      : 'Message Admins or candidates in active application rounds.'}
                  </p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact._id}
                    onClick={() => handleStartChat(contact._id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-l-2 border-transparent hover:bg-white/5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-500/10">
                      {contact.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#f1f5f9' }}>{contact.name}</p>
                      <p className="text-[10px] font-bold capitalize mt-0.5" style={{ color: '#64748b' }}>
                        {contact.role} • {contact.email}
                      </p>
                    </div>
                  </button>
                ))
              )
            ) : loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                <img
                  src="/messages_bg.png"
                  alt="No conversations yet"
                  className="w-32 h-32 object-contain mb-4 opacity-85 rounded-2xl"
                />
                <p className="text-sm font-bold" style={{ color: '#94a3b8' }}>No conversations yet</p>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#475569' }}>
                  Start a chat or group conversation using the buttons above to contact your placement officers or candidates.
                </p>
              </div>
            ) : (
              rooms.map(room => {
                const isRoomGroup = room.isGroup
                const other = getOtherUser(room)
                const isActive = activeRoom?._id === room._id
                const displayName = isRoomGroup ? room.groupName : (other.name || 'User')
                const displaySub = isRoomGroup 
                  ? (room.lastMessage?.content || 'Group chat created') 
                  : (room.lastMessage?.content || 'No messages yet')

                return (
                  <button
                    key={room._id}
                    onClick={() => {
                      setActiveRoom(room)
                      setShowDetailsPanel(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left border-l-2 relative"
                    style={{
                      borderLeftColor: isActive ? '#f97316' : 'transparent',
                      background: isActive ? 'rgba(249,115,22,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-sm"
                      style={{
                        background: isActive 
                          ? '#f97316' 
                          : isRoomGroup ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                        color: isActive 
                          ? '#fff' 
                          : isRoomGroup ? '#818cf8' : '#94a3b8',
                        border: isRoomGroup && !isActive ? '1px solid rgba(99,102,241,0.2)' : 'none'
                      }}
                    >
                      {isRoomGroup ? <Users className="w-4 h-4" /> : (displayName?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold truncate" style={{ color: '#f1f5f9' }}>{displayName}</p>
                        {isRoomGroup && (
                          <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                            Group
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5 font-medium" style={{ color: isActive ? '#94a3b8' : '#475569' }}>
                        {displaySub}
                      </p>
                    </div>
                    {room.meetingActive && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Chat Area ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative" style={{ background: '#0d1526' }}>
          {activeRoom ? (
            <>
              {/* Chat Header */}
              <div
                className="h-16 px-5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111827' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl text-white font-bold text-sm flex items-center justify-center animate-fade-in"
                    style={{
                      background: activeRoom.isGroup ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f97316'
                    }}
                  >
                    {activeRoom.isGroup ? <Users className="w-4.5 h-4.5" /> : (getOtherUser(activeRoom).name?.[0]?.toUpperCase() || 'U')}
                  </div>
                  <div>
                    <p className="text-sm font-bold leading-tight text-slate-100">
                      {activeRoom.isGroup ? activeRoom.groupName : getOtherUser(activeRoom).name}
                    </p>
                    <p className="text-[10px] font-bold capitalize mt-0.5" style={{ color: '#64748b' }}>
                      {activeRoom.isGroup 
                        ? `${activeRoom.participants?.length || 0} participants` 
                        : `${getOtherUser(activeRoom).role} • ${getOtherUser(activeRoom).email}`}
                    </p>
                  </div>
                </div>

                {/* Call & Group Controls */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp-like Jitsi Video Call */}
                  {(!activeRoom.isGroup || userIsAdmin || isMeGroupAdmin()) && (
                    <button
                      onClick={() => activeRoom.meetingActive ? handleToggleMeeting('stop') : handleToggleMeeting('start')}
                      className={`p-2 rounded-xl transition-all shadow-lg flex items-center justify-center ${
                        activeRoom.meetingActive 
                          ? 'bg-rose-500 text-white shadow-rose-500/20 animate-pulse hover:bg-rose-600' 
                          : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
                      }`}
                      title={activeRoom.meetingActive ? 'End Live Meeting' : 'Start Video Call'}
                    >
                      {activeRoom.meetingActive ? <Phone className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedParticipants(activeRoom.participants?.map(p => p._id) || [])
                      setShowDetailsPanel(!showDetailsPanel)
                    }}
                    className={`p-2 rounded-xl transition-all ${
                      showDetailsPanel 
                        ? 'bg-white/10 text-orange-400' 
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                    title="Conversation Details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Jitsi Call Notification Banner */}
              {activeRoom.meetingActive && (
                <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-3 flex items-center justify-between text-xs text-emerald-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                    <span className="font-semibold">Live Jitsi conference room active!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={activeRoom.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold tracking-wide transition-all shadow-sm shadow-emerald-500/30"
                    >
                      Join Video Call
                    </a>
                    {(userIsAdmin || isMeGroupAdmin()) && (
                      <button
                        onClick={() => handleToggleMeeting('stop')}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-bold transition-all"
                      >
                        End Call
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages View */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <AnimatePresence initial={false}>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16">
                      <MessageSquare className="w-10 h-10 mb-3" style={{ color: '#334155' }} />
                      <p className="text-sm font-semibold" style={{ color: '#64748b' }}>No messages yet</p>
                      <p className="text-xs mt-1" style={{ color: '#475569' }}>Say hello to get the conversation started!</p>
                    </div>
                  )}
                  {messages.map(msg => {
                    const isMine = (msg.senderId?._id || msg.senderId) === myId
                    const senderName = msg.senderId?.name || 'User'
                    const senderRole = msg.senderId?.role || 'user'
                    
                    // Detect system / call messages
                    const isSystem = msg.content?.includes('📞 Meeting') || msg.content?.includes('Group created')
                    
                    if (isSystem) {
                      return (
                        <div key={msg._id} className="flex justify-center my-3">
                          <div className="bg-slate-800/60 border border-slate-700/50 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide text-slate-300 flex items-center gap-2 shadow-sm">
                            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            <span>{msg.content}</span>
                          </div>
                        </div>
                      )
                    }

                    // Render Interactive Poll
                    if (msg.isPoll) {
                      const totalPollVotes = msg.pollOptions?.reduce((acc, curr) => acc + (curr.votes?.length || 0), 0) || 0
                      
                      return (
                        <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} my-2 w-full`}>
                          {!isMine && activeRoom.isGroup && (
                            <span className="text-[10px] font-bold mb-1 pl-1 text-indigo-400 capitalize">
                              {senderName} • <span className="text-slate-500 font-medium text-[9px]">{senderRole}</span>
                            </span>
                          )}
                          <div
                            className="w-full max-w-[320px] rounded-3xl p-5 border border-white/5 shadow-xl text-slate-200"
                            style={{
                              background: '#1a2234',
                              borderTopLeftRadius: !isMine ? 4 : 24,
                              borderTopRightRadius: isMine ? 4 : 24,
                            }}
                          >
                            {/* Poll Header */}
                            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/5">
                              <BarChart3 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="text-xs font-bold text-slate-100 tracking-wide uppercase">Group Poll</span>
                            </div>
                            
                            <h4 className="text-sm font-bold text-slate-100 leading-tight mb-4 tracking-wide">
                              {msg.pollQuestion}
                            </h4>

                            {/* Poll Options mapping */}
                            <div className="space-y-2.5">
                              {msg.pollOptions?.map((opt) => {
                                const optVotes = opt.votes?.length || 0
                                const votePct = totalPollVotes > 0 ? Math.round((optVotes / totalPollVotes) * 100) : 0
                                const hasVoted = opt.votes?.some(v => (v._id || v) === myId)

                                return (
                                  <button
                                    key={opt._id}
                                    type="button"
                                    onClick={() => handleVotePoll(msg._id, opt._id)}
                                    className="w-full relative rounded-2xl overflow-hidden py-3 px-4 border text-left flex items-center justify-between transition-all duration-200 group"
                                    style={{
                                      background: 'rgba(255,255,255,0.02)',
                                      borderColor: hasVoted ? '#ea580c' : 'rgba(255,255,255,0.08)'
                                    }}
                                  >
                                    {/* Vote Progress Fill */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 transition-all duration-500 bg-orange-500/10 pointer-events-none"
                                      style={{ width: `${votePct}%` }}
                                    />
                                    
                                    <span className="text-xs font-bold truncate z-10 pr-2 select-none text-slate-200">
                                      {opt.optionText}
                                    </span>
                                    
                                    <div className="flex items-center gap-2 z-10 flex-shrink-0 select-none">
                                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                                        {optVotes} {optVotes === 1 ? 'vote' : 'votes'} ({votePct}%)
                                      </span>
                                      {hasVoted && (
                                        <div className="w-3.5 h-3.5 rounded bg-orange-500 text-white flex items-center justify-center">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            
                            {/* Poll Footer */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[9px] text-slate-500 font-bold">
                              <span>Total: {totalPollVotes} votes</span>
                              <span>Click an option to vote</span>
                            </div>
                          </div>
                          <span className="text-[10px] mt-1 font-medium px-1 text-slate-600">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )
                    }

                    const tickStatus = getMessageReadStatus(msg)

                    return (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group/msg w-full`}
                      >
                        {/* Display sender identity in Group chat rooms */}
                        {!isMine && activeRoom.isGroup && (
                          <span className="text-[10px] font-bold mb-1 pl-1 text-indigo-400 capitalize">
                            {senderName} • <span className="text-slate-500 font-medium text-[9px]">{senderRole}</span>
                          </span>
                        )}
                        <div
                          className="max-w-[65%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm flex flex-col relative"
                          style={isMine
                            ? { background: '#f97316', color: '#fff', borderBottomRightRadius: 4 }
                            : { background: '#1a2234', color: '#e2e8f0', borderBottomLeftRadius: 4, border: '1px solid rgba(255,255,255,0.06)' }
                          }
                        >
                          {msg.content}
                          
                          {/* Seen Info Trigger Button for sent messages on hover */}
                          {isMine && (
                            <button
                              type="button"
                              onClick={() => setSelectedSeenInfoMessage(msg)}
                              className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded bg-slate-800 text-slate-400 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center justify-center shadow-md border border-white/5"
                              title="Seen Info"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[10px] font-medium text-slate-600">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* WhatsApp Ticks */}
                          {isMine && (
                            <div className="flex items-center">
                              {tickStatus === 'sent' && (
                                <Check className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                              )}
                              {tickStatus === 'delivered' && (
                                <div className="flex items-center -space-x-1.5">
                                  <Check className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                                  <Check className="w-3 h-3 text-slate-600 stroke-[2.5]" />
                                </div>
                              )}
                              {tickStatus === 'read' && (
                                <div className="flex items-center -space-x-1.5">
                                  <Check className="w-3 h-3 text-sky-400 stroke-[2.5] shadow-sm shadow-sky-500/20" />
                                  <Check className="w-3 h-3 text-sky-400 stroke-[2.5] shadow-sm shadow-sky-500/20" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div
                className="px-4 py-3 flex-shrink-0 relative"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111827' }}
              >
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  {/* Create Poll Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setPollQuestion('')
                      setPollOptions(['', ''])
                      setShowPollModal(true)
                    }}
                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-sm"
                    title="Create Group Poll"
                  >
                    <BarChart className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full px-5 py-2.5 text-sm focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-orange-500/20 flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-px" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <img
                src="/messages_bg.png"
                alt="Select a conversation"
                className="w-48 h-48 object-contain mb-5 opacity-80 animate-pulse"
              />
              <h3 className="text-base font-bold" style={{ color: '#94a3b8' }}>Select a conversation</h3>
              <p className="text-sm mt-1 max-w-xs leading-relaxed" style={{ color: '#475569' }}>
                Choose a conversation from the sidebar to start messaging your team.
              </p>
            </div>
          )}
        </div>

        {/* ── Side Info Drawer Panel ───────────────────────── */}
        <AnimatePresence>
          {showDetailsPanel && activeRoom && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l border-white/5 flex flex-col flex-shrink-0 relative z-20 shadow-2xl"
              style={{ background: '#111827' }}
            >
              {/* Header */}
              <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">Conversation Details</h3>
                <button
                  onClick={() => setShowDetailsPanel(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Meta */}
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg text-white font-bold text-xl mb-3"
                    style={{
                      background: activeRoom.isGroup ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#f97316'
                    }}
                  >
                    {activeRoom.isGroup ? <Users className="w-7 h-7" /> : (getOtherUser(activeRoom).name?.[0]?.toUpperCase() || 'U')}
                  </div>
                  <h4 className="text-sm font-bold text-slate-100">
                    {activeRoom.isGroup ? activeRoom.groupName : getOtherUser(activeRoom).name}
                  </h4>
                  <p className="text-[10px] text-indigo-400 font-bold tracking-wider mt-1 uppercase">
                    {activeRoom.isGroup ? 'Group Conversation' : 'Direct Conversation'}
                  </p>
                </div>

                {/* Live Call Alert */}
                {activeRoom.meetingActive && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-center shadow-sm">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-2" />
                    <span className="text-xs font-bold text-emerald-400">Meeting in progress!</span>
                    <a
                      href={activeRoom.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block w-full text-center py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition-all shadow shadow-emerald-500/20"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}

                {/* Member Directory */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Group Members</p>
                    {activeRoom.isGroup && (userIsAdmin || isMeGroupAdmin()) && (
                      <button
                        onClick={() => {
                          setSelectedParticipants(activeRoom.participants?.map(p => p._id) || [])
                          setShowManageMembers(!showManageMembers)
                        }}
                        className="text-[9px] font-bold text-orange-400 hover:text-orange-500 tracking-wide transition-colors"
                      >
                        {showManageMembers ? 'Back' : 'Manage'}
                      </button>
                    )}
                  </div>

                  {showManageMembers && activeRoom.isGroup && (userIsAdmin || isMeGroupAdmin()) ? (
                    // Edit Members selection
                    <div className="space-y-2 border border-slate-700/50 rounded-xl p-3 bg-white/5">
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {contacts.map(c => {
                          const isSel = selectedParticipants.includes(c._id)
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => toggleParticipantSelection(c._id)}
                              className="w-full flex items-center justify-between text-left p-1.5 rounded hover:bg-white/5 transition-colors"
                            >
                              <span className="text-[11px] font-bold text-slate-300 truncate">{c.name} ({c.role})</span>
                              {isSel ? <Check className="w-3.5 h-3.5 text-orange-400" /> : <div className="w-3.5 h-3.5 rounded border border-slate-600" />}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={handleUpdateMembers}
                        className="mt-2 w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[10px] rounded-lg transition-all"
                      >
                        Apply Updates
                      </button>
                    </div>
                  ) : (
                    // Simple listing with admin controls
                    <div className="space-y-2">
                      {activeRoom.participants?.map(member => {
                        const isMemberAdmin = activeRoom.groupAdmins?.some(a => (a._id || a) === member._id)
                        const showControls = activeRoom.isGroup && (userIsAdmin || isMeGroupAdmin()) && member._id !== myId
                        
                        return (
                          <div key={member._id} className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all group/member">
                            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-400 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              {member.name?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-200 truncate leading-none">{member.name}</p>
                              <p className="text-[9px] font-medium text-slate-500 capitalize mt-1 leading-none">{member.role}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {isMemberAdmin && (
                                <span className="text-[7px] font-bold tracking-wide uppercase px-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                  Admin
                                </span>
                              )}
                              {/* Group Admin Promote/Demote privilege controls */}
                              {showControls && (
                                <button
                                  onClick={() => isMemberAdmin ? handleToggleAdminStatus(member._id, 'demote') : handleToggleAdminStatus(member._id, 'promote')}
                                  className="opacity-0 group-hover/member:opacity-100 text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 hover:bg-orange-500 hover:text-white transition-all"
                                  title={isMemberAdmin ? 'Demote Admin' : 'Promote Admin'}
                                >
                                  {isMemberAdmin ? 'Demote' : 'Make Admin'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Audit Logs (WhatsApp-style Logs) */}
                {activeRoom.isGroup && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Group Logs</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {activeRoom.groupLogs?.map((log, idx) => (
                        <div key={log._id || idx} className="text-[9px] text-slate-400 bg-white/5 p-2 rounded-lg border border-white/5">
                          <p className="font-bold text-slate-300">{log.action}</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">
                            {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Admin: Create Group Modal Overlay ───────────── */}
        <AnimatePresence>
          {showGroupModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="px-5 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">Create WhatsApp-style Group Chat</h3>
                  <button
                    onClick={() => setShowGroupModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Name</label>
                    <input
                      type="text"
                      placeholder="e.g. TPO Core Team"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Members</label>
                      <span className="text-[9px] font-bold text-indigo-400">
                        {selectedParticipants.length} selected
                      </span>
                    </div>
                    
                    <div
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div className="max-h-48 overflow-y-auto p-2 bg-slate-950/60 divide-y divide-white/5">
                        {contacts.length === 0 ? (
                          <p className="text-[10px] text-center text-slate-500 py-6">No eligible contacts found</p>
                        ) : (
                          contacts.map(c => {
                            const isSelected = selectedParticipants.includes(c._id)
                            return (
                              <button
                                key={c._id}
                                type="button"
                                onClick={() => toggleParticipantSelection(c._id)}
                                className="w-full flex items-center justify-between text-left p-2 hover:bg-white/5 transition-colors rounded-lg"
                              >
                                <div>
                                  <p className="text-xs font-bold text-slate-200 leading-tight">{c.name}</p>
                                  <p className="text-[9px] font-bold capitalize text-slate-500 mt-0.5">{c.role} • {c.email}</p>
                                </div>
                                <div className="flex-shrink-0 ml-3">
                                  {isSelected ? (
                                    <div className="w-4 h-4 rounded bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shadow shadow-indigo-500/35">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded border border-slate-700" />
                                  )}
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all text-center"
                  >
                    Create and Start Messaging
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Custom Poll Modal Creator Overlay ───────────── */}
        <AnimatePresence>
          {showPollModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              >
                <div className="px-5 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">Create Native Chat Poll</h3>
                  <button
                    onClick={() => setShowPollModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreatePoll} className="p-5 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Poll Question</label>
                    <input
                      type="text"
                      placeholder="e.g. Are you joining the drive tomorrow?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Poll Options</label>
                    
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                        required={idx < 2} // Force at least 2 options
                      />
                    ))}

                    {pollOptions.length < 5 && (
                      <button
                        type="button"
                        onClick={addPollOptionField}
                        className="mt-1 text-[10px] font-bold text-orange-400 hover:text-orange-500 flex items-center gap-1 py-1 px-2 rounded hover:bg-white/5 transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add Option
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all text-center mt-2"
                  >
                    Send Poll Message
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── WhatsApp-style Seen Info details popup ──────── */}
        <AnimatePresence>
          {selectedSeenInfoMessage && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                {/* Header */}
                <div className="px-5 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-sky-400 stroke-[3]" />
                    <h3 className="text-sm font-bold text-slate-200">Message Info</h3>
                  </div>
                  <button
                    onClick={() => setSelectedSeenInfoMessage(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Message Bubble Preview */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Message Preview</p>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{selectedSeenInfoMessage.content}</p>
                    <span className="block text-[9px] text-slate-600 mt-2 font-bold">
                      Sent at: {new Date(selectedSeenInfoMessage.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Read By details list */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase text-sky-400 tracking-wider">Read By</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-white/5 pr-1">
                      {selectedSeenInfoMessage.readBy?.filter(r => (r.userId?._id || r.userId) !== myId).length === 0 ? (
                        <p className="text-[10px] text-slate-500 py-3 text-center">No one has seen it yet.</p>
                      ) : (
                        selectedSeenInfoMessage.readBy
                          ?.filter(r => (r.userId?._id || r.userId) !== myId)
                          .map((r, idx) => {
                            const reader = r.userId
                            if (!reader) return null
                            return (
                              <div key={idx} className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6.5 h-6.5 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-[10px] flex items-center justify-center">
                                    {reader.name?.[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-slate-200 leading-tight">{reader.name}</p>
                                    <p className="text-[9px] font-bold text-slate-500 capitalize">{reader.role}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  {new Date(r.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )
                          })
                      )}
                    </div>
                  </div>

                  {/* Delivered to (remaining participants) */}
                  {activeRoom.isGroup && (
                    <div className="space-y-2 border-t border-white/5 pt-4">
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Delivered To</p>
                      <div className="space-y-2 max-h-36 overflow-y-auto divide-y divide-white/5 pr-1">
                        {(() => {
                          const readersIds = selectedSeenInfoMessage.readBy?.map(r => (r.userId?._id || r.userId).toString()) || []
                          const remaining = activeRoom.participants?.filter(p => p._id !== myId && !readersIds.includes(p._id.toString())) || []
                          
                          if (remaining.length === 0) {
                            return <p className="text-[10px] text-slate-500 py-3 text-center">Delivered and read by everyone!</p>
                          }
                          
                          return remaining.map(p => (
                            <div key={p._id} className="flex items-center gap-2 pt-2">
                              <div className="w-6.5 h-6.5 rounded-lg bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center">
                                {p.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 leading-tight">{p.name}</p>
                                <p className="text-[9px] font-bold text-slate-600 capitalize">{p.role}</p>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  )
}

export default Messages
