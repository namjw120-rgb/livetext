import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false })

function generateEventId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function Operator() {
  const router = useRouter()

  const [eventId, setEventId] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [pendingMessages, setPendingMessages] = useState([])
  const [approvedMessages, setApprovedMessages] = useState([])
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    const url = window.location.origin
    setBaseUrl(url)
    if (router.query.event) {
      setEventId(router.query.event)
    } else {
      const newId = generateEventId()
      router.replace({ query: { event: newId } }, undefined, { shallow: true })
      setEventId(newId)
    }
  }, [router.isReady, router.query.event])

  const loadMessages = useCallback(async () => {
    if (!eventId) return
    const { data: pending } = await supabase
      .from('messages')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    const { data: approved } = await supabase
      .from('messages')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })

    if (pending) setPendingMessages(pending)
    if (approved) setApprovedMessages(approved)
  }, [eventId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!eventId) return
    const channel = supabase
      .channel(`operator-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `event_id=eq.${eventId}` },
        () => loadMessages()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [eventId, loadMessages])

  const handleApprove = async (message) => {
    await supabase
      .from('messages')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', message.id)
  }

  const handleReject = async (message) => {
    await supabase
      .from('messages')
      .update({ status: 'rejected' })
      .eq('id', message.id)
  }

  // 승인 풀에서 제거
  const handleRemoveFromPool = async (message) => {
    await supabase
      .from('messages')
      .update({ status: 'rejected' })
      .eq('id', message.id)
  }

  const participantUrl = `${baseUrl}/participant?event=${eventId}`
  const screenUrl = `${baseUrl}/screen?event=${eventId}`

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <>
      <Head>
        <title>LIVE TEXT - 운영자</title>
      </Head>

      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">LIVE TEXT</h1>
            <span className="text-gray-500 text-sm">운영자</span>
            {eventId && (
              <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs font-mono">
                #{eventId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href={screenUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              스크린 열기 →
            </a>
            <button
              onClick={() => setShowQR(!showQR)}
              className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {showQR ? 'QR 닫기' : 'QR 코드 보기'}
            </button>
          </div>
        </div>

        {/* QR 패널 */}
        {showQR && (
          <div className="border-b border-gray-800 px-6 py-5 bg-gray-900 animate-fade-in">
            <div className="flex items-start gap-8">
              <div className="bg-white p-4 rounded-2xl">
                <QRCodeSVG value={participantUrl} size={140} />
              </div>
              <div>
                <p className="text-gray-300 text-sm font-medium mb-2">참가자 접속 링크</p>
                <p className="text-gray-500 text-xs font-mono break-all mb-4">{participantUrl}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(participantUrl)}
                  className="text-xs border border-gray-700 text-gray-400 px-3 py-1.5 rounded-lg hover:border-gray-500 hover:text-white transition-colors"
                >
                  링크 복사
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 안내 배너 */}
        <div className="bg-blue-950/40 border-b border-blue-900/40 px-6 py-2.5 flex items-center gap-3">
          <span className="text-blue-400 text-xs font-medium">스크린 자동 순환</span>
          <span className="text-gray-500 text-xs">
            승인된 메시지는 스크린에 자동으로 순환 표시됩니다 (최대 10개 동시 표시, 4초마다 교체)
          </span>
          <span className="ml-auto text-gray-600 text-xs font-mono">
            풀: {approvedMessages.length}개
          </span>
        </div>

        {/* 2단 레이아웃 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 왼쪽: 대기 중 */}
          <div className="w-1/2 border-r border-gray-800 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-300">대기 중</h2>
                {pendingMessages.length > 0 && (
                  <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingMessages.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {pendingMessages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-700 text-sm">대기 중인 메시지가 없습니다</p>
                </div>
              ) : (
                pendingMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-fade-in"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs font-medium">{msg.nickname}</span>
                      <span className="text-gray-700 text-xs">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-white text-sm leading-relaxed mb-3">{msg.content}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(msg)}
                        className="flex-1 py-2 bg-white text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        승인 → 스크린
                      </button>
                      <button
                        onClick={() => handleReject(msg)}
                        className="flex-1 py-2 bg-gray-800 text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 오른쪽: 순환 풀 */}
          <div className="w-1/2 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-300">순환 풀 (스크린 표시 중)</h2>
                {approvedMessages.length > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {approvedMessages.length}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {approvedMessages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-700 text-sm">승인된 메시지가 없습니다</p>
                  <p className="text-gray-800 text-xs mt-2">승인하면 스크린에 자동 표시됩니다</p>
                </div>
              ) : (
                approvedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-fade-in"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs font-medium">{msg.nickname}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 text-xs">{formatTime(msg.approved_at)}</span>
                        <button
                          onClick={() => handleRemoveFromPool(msg)}
                          className="text-gray-700 hover:text-red-400 text-xs transition-colors"
                          title="풀에서 제거"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
