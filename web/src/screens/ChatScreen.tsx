/**
 * 온곁 리멤버 - 대화 화면
 */

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import CrisisModal from '../components/CrisisModal'
import './ChatScreen.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showCrisisModal, setShowCrisisModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initConversation()
    loadMessages()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // 온라인/오프라인 상태 감지
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 반려동물 조회
      const { data: pet } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (!pet) return

      // 대화 세션 조회 또는 생성
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('pet_id', pet.id)
        .limit(1)
        .single()

      if (existingConv) {
        setConversationId(existingConv.id)
      } else {
        // 새 대화 생성
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ user_id: user.id, pet_id: pet.id })
          .select('id')
          .single()

        if (newConv) {
          setConversationId(newConv.id)
        }
      }
    } catch (err) {
      console.error('[ChatScreen] 대화 초기화 실패:', err)
    }
  }

  const loadMessages = async () => {
    // 메시지 로딩은 간단히 구현 (필요시 확장)
    // 실제로는 conversationId가 있을 때만 로드
  }

  const handleSend = async () => {
    if (!input.trim() || !conversationId || isStreaming) return

    const userMessage = input.trim()
    setInput('')

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsStreaming(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('세션 없음')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            conversationId,
            message: userMessage,
          }),
        }
      )

      // Content-Type 확인
      const contentType = response.headers.get('Content-Type')

      if (contentType?.includes('application/json')) {
        // JSON 응답 (crisis 또는 limit)
        const data = await response.json()

        if (data.type === 'crisis') {
          setShowCrisisModal(true)
        } else if (data.type === 'limit') {
          const scope = data.scope === 'user' ? '일일 대화 횟수' : '전체 사용량'
          setLimitMessage(`${scope} 제한에 도달했습니다. 내일 다시 이용해 주세요.`)
        }
      } else if (contentType?.includes('text/event-stream')) {
        // SSE 스트리밍
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        let assistantMessage = ''

        // 빈 어시스턴트 메시지 추가
        setMessages(prev => [...prev, { role: 'assistant', content: '' }])

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantMessage += parsed.content

                  // 마지막 메시지 업데이트
                  setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage,
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // JSON 파싱 실패 무시
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[ChatScreen] 메시지 전송 실패:', err)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해 주세요.' },
      ])
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-screen">
      {/* AI 안내 배너 */}
      <div className="chat-banner">
        <p className="text-muted">
          온곁은 AI 동반자예요. 전문 상담이 필요하시면 언제든 상담사와 연결해 드릴게요.
        </p>
      </div>

      {/* 오프라인 안내 */}
      {!isOnline && (
        <div className="offline-notice">
          <p>현재 오프라인 상태입니다. 대화 기능을 사용하려면 인터넷 연결이 필요합니다.</p>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="messages-container">
        {limitMessage && (
          <div className="limit-notice">{limitMessage}</div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}

        {isStreaming && (
          <div className="message assistant">
            <div className="message-bubble typing">입력 중...</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="chat-input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isOnline ? "이야기를 들려주세요..." : "오프라인 상태입니다"}
          disabled={!isOnline || isStreaming || !!limitMessage}
          rows={2}
        />
        <button
          className="button-primary"
          onClick={handleSend}
          disabled={!isOnline || !input.trim() || isStreaming || !!limitMessage}
        >
          전송
        </button>
      </div>

      {/* 위기 모달 */}
      {showCrisisModal && (
        <CrisisModal onClose={() => setShowCrisisModal(false)} />
      )}
    </div>
  )
}
