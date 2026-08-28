import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

// 슬랫 하나가 화면 높이만큼 스크롤되는 데 걸리는 시간 (초)
const SCROLL_SECONDS = 30

const SLAT_TYPES = ['dark', 'mid', 'pale']

const SLAT_STYLES = {
  dark: {
    background: '#8b6343',
    border: 'none',
    nameColor: 'rgba(240,230,211,0.75)',
    textColor: '#f5ece0',
  },
  mid: {
    background: 'rgba(196,149,106,0.28)',
    border: '1px solid rgba(140,99,67,0.30)',
    nameColor: '#a67c52',
    textColor: '#4a3520',
  },
  pale: {
    background: '#f0e6d3',
    border: '1px solid rgba(140,99,67,0.22)',
    nameColor: '#a67c52',
    textColor: '#4a3520',
  },
}

function getSlatFontSize(len) {
  if (len <= 15)  return '2rem'
  if (len <= 40)  return '1.6rem'
  if (len <= 80)  return '1.3rem'
  if (len <= 120) return '1.1rem'
  return '0.95rem'
}

const ROPE_STYLE = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 8,
  zIndex: 15,
  background: 'repeating-linear-gradient(170deg, #7a5230 0px, #7a5230 3px, #c49a6a 3px, #c49a6a 6px, #7a5230 6px, #7a5230 9px)',
  borderRadius: 4,
}

const KNOT_STYLE = {
  position: 'absolute',
  width: 16,
  height: 16,
  borderRadius: '50%',
  zIndex: 20,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'radial-gradient(circle at 38% 32%, #c49a6a, #7a5230)',
  border: '1.5px solid #5c3d1e',
}

export default function Screen() {
  const router = useRouter()
  const { event } = router.query

  const [messages, setMessages] = useState([])
  const trackRef   = useRef(null)
  const screenRef  = useRef(null)
  const posRef     = useRef(0)
  const rafRef     = useRef(null)
  const lastTsRef  = useRef(null)

  // 초기 로드
  useEffect(() => {
    if (!event) return
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('event_id', event)
        .eq('status', 'approved')
        .order('approved_at', { ascending: true })
      if (data) setMessages(data)
    }
    load()
  }, [event])

  // 실시간 — 새 승인 메시지 반영
  useEffect(() => {
    if (!event) return
    const channel = supabase
      .channel(`screen-${event}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `event_id=eq.${event}` },
        async () => {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('event_id', event)
            .eq('status', 'approved')
            .order('approved_at', { ascending: true })
          if (data) setMessages(data)
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [event])

  // 컨베이어 벨트 애니메이션
  useEffect(() => {
    if (!trackRef.current || !screenRef.current || messages.length === 0) return

    cancelAnimationFrame(rafRef.current)
    lastTsRef.current = null

    function loop(ts) {
      if (!trackRef.current || !screenRef.current) return

      if (lastTsRef.current !== null) {
        const dt = ts - lastTsRef.current
        const sh = screenRef.current.offsetHeight || 1080
        const speed = sh / (SCROLL_SECONDS * 1000) // px/ms

        posRef.current += speed * dt

        // 절반(원본 1세트) 지나면 처음으로 — 무한 루프
        const half = trackRef.current.scrollHeight / 2
        if (half > 0 && posRef.current >= half) {
          posRef.current -= half
        }

        trackRef.current.style.transform = `translateY(${-posRef.current}px)`
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [messages])

  return (
    <>
      <Head>
        <title>EUNSUNG CHURCH - 스크린</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div
        ref={screenRef}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#f5ece0',
          overflow: 'hidden',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        {/* 헤더 */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 32px 0', zIndex: 30, pointerEvents: 'none',
        }}>
          <p style={{ color: '#5c3d1e', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '2.5px', margin: 0 }}>
            EUNSUNG CHURCH
          </p>
          {event && (
            <p style={{ color: '#a67c52', fontSize: '0.72rem', fontFamily: 'monospace', margin: 0 }}>
              #{event}
            </p>
          )}
        </div>

        {/* 꽈배기 줄 — 왼쪽 */}
        <div style={{ ...ROPE_STYLE, left: '3.5%' }} />
        {/* 꽈배기 줄 — 오른쪽 */}
        <div style={{ ...ROPE_STYLE, right: '3.5%' }} />

        {/* 슬랫 트랙 */}
        {messages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ color: '#c4956a', fontSize: '1.2rem', fontWeight: 400, letterSpacing: '3px', margin: 0 }}>
              메시지를 기다리는 중
            </p>
          </div>
        ) : (
          <div
            ref={trackRef}
            style={{
              position: 'absolute',
              left: 0, right: 0, top: 0,
              display: 'flex',
              flexDirection: 'column',
              zIndex: 5,
            }}
          >
            {/* 무한 루프를 위해 메시지 2배 복제 */}
            {[...messages, ...messages].map((msg, i) => {
              const type  = SLAT_TYPES[i % 3]
              const style = SLAT_STYLES[type]
              const fs    = getSlatFontSize(msg.content.length)

              return (
                <div
                  key={`${msg.id}-${i}`}
                  style={{
                    width: '100%',
                    position: 'relative',
                    padding: '6px 0',
                  }}
                >
                  {/* 왼쪽 매듭 */}
                  <div style={{ ...KNOT_STYLE, left: 'calc(3.5% - 4px)' }} />
                  {/* 오른쪽 매듭 */}
                  <div style={{ ...KNOT_STYLE, right: 'calc(3.5% - 4px)' }} />

                  {/* 슬랫 몸통 */}
                  <div style={{
                    marginLeft: '7.5%',
                    marginRight: '7.5%',
                    borderRadius: 12,
                    padding: '16px 30px',
                    background: style.background,
                    border: style.border || 'none',
                    position: 'relative',
                    zIndex: 6,
                  }}>
                    <span style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      marginBottom: 6,
                      color: style.nameColor,
                    }}>
                      {msg.nickname}
                    </span>
                    <p style={{
                      margin: 0,
                      fontSize: fs,
                      fontWeight: 700,
                      lineHeight: 1.45,
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      color: style.textColor,
                    }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
