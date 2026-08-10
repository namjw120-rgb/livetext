import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Participant() {
  const router = useRouter()
  const { event } = router.query

  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const MAX_CHARS = 150

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    if (!event) {
      setError('잘못된 접근입니다. QR 코드를 다시 스캔해 주세요.')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: dbError } = await supabase.from('messages').insert({
      event_id: event,
      content: content.trim(),
      nickname: nickname.trim() || '익명',
      status: 'pending',
    })

    if (dbError) {
      setError('전송에 실패했습니다. 다시 시도해 주세요.')
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const handleSendAnother = () => {
    setContent('')
    setNickname('')
    setSubmitted(false)
  }

  const remaining = MAX_CHARS - content.length

  if (!event && typeof window !== 'undefined') {
    return (
      <div style={styles.page}>
        <p style={{ color: '#c0392b', fontSize: 16 }}>유효하지 않은 접근입니다.</p>
        <p style={{ color: '#7db882', marginTop: 8, fontSize: 13 }}>QR 코드를 다시 스캔해 주세요.</p>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>EUNSUNG SURVEY - 메시지 보내기</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet" />
      </Head>

      <div style={styles.page}>
        {/* 헤더 */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={styles.logo}>EUNSUNG SURVEY</h1>
          <p style={styles.subText}>현장 스크린에 메시지를 보내세요</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={styles.successCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ color: '#2d7a3a', fontSize: 18, fontWeight: 700, margin: '20px 0 8px' }}>메시지가 전송되었습니다!</p>
            <p style={{ color: '#7db882', fontSize: 13, margin: 0 }}>운영자 확인 후 스크린에 표시됩니다</p>
            <button onClick={handleSendAnother} style={styles.anotherBtn}>다른 메시지 보내기</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 닉네임 */}
            <div>
              <label style={styles.label}>이름 (선택)</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="익명"
                maxLength={20}
                style={styles.input}
              />
            </div>

            {/* 메시지 */}
            <div>
              <label style={styles.label}>메시지</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="스크린에 표시될 메시지를 입력하세요"
                rows={5}
                style={{ ...styles.input, resize: 'none', lineHeight: 1.7 }}
              />
              <p style={{ ...styles.counter, color: remaining <= 20 ? '#c0392b' : '#8ec294' }}>
                {remaining}자 남음
              </p>
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={!content.trim() || submitting}
              style={{
                ...styles.submitBtn,
                opacity: !content.trim() || submitting ? 0.45 : 1,
                cursor: !content.trim() || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? '전송 중...' : '메시지 보내기'}
            </button>
          </form>
        )}

        <p style={styles.footer}>운영자가 확인한 메시지만 스크린에 표시됩니다</p>
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#e8f5e3',
    padding: '48px 24px 32px',
    fontFamily: "'Noto Sans KR', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    color: '#2d7a3a',
    fontSize: 24,
    fontWeight: 900,
    margin: '0 0 4px',
    letterSpacing: '-0.5px',
  },
  subText: {
    color: '#5a9e65',
    fontSize: 13,
    margin: 0,
    fontWeight: 400,
  },
  label: {
    display: 'block',
    color: '#5a9e65',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    background: '#fff',
    border: 'none',
    borderRadius: 16,
    padding: '13px 16px',
    fontSize: 15,
    color: '#2d4a30',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Noto Sans KR', sans-serif",
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
    margin: '5px 0 0',
  },
  submitBtn: {
    width: '100%',
    background: '#2d7a3a',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '16px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Noto Sans KR', sans-serif",
    marginTop: 8,
  },
  footer: {
    color: '#7db882',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: '#2d7a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  anotherBtn: {
    marginTop: 28,
    background: 'transparent',
    border: '1.5px solid #2d7a3a',
    borderRadius: 14,
    color: '#2d7a3a',
    padding: '11px 24px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Noto Sans KR', sans-serif",
    cursor: 'pointer',
  },
}
