import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const TIPS = [
  'What was the best part of today?',
  'How are you feeling right now?',
  'What\'s been on your mind lately?',
  'What challenged you today?',
  'What are you grateful for?',
  'What do you want to remember about today?'
]

export default function Record() {
  const [state, setState] = useState('idle') // idle | previewing | recording | uploading | done | error
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)])
  const [blob, setBlob] = useState(null)

  const videoRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const navigate = useNavigate()

  const startPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.play()
      }
      setState('previewing')
    } catch (err) {
      setError('Could not access camera/microphone. Please check permissions.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    startPreview()
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    setElapsed(0)

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const recorded = new Blob(chunksRef.current, { type: 'video/webm' })
      setBlob(recorded)

      // Preview the recorded video
      const url = URL.createObjectURL(recorded)
      if (videoRef.current) {
        videoRef.current.srcObject = null
        videoRef.current.src = url
        videoRef.current.muted = false
        videoRef.current.controls = true
        videoRef.current.play()
      }
      setState('done')
    }

    recorder.start(1000)
    setState('recording')
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }

  const stopRecording = () => {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const retake = () => {
    setBlob(null)
    setElapsed(0)
    if (videoRef.current) {
      videoRef.current.src = ''
      videoRef.current.controls = false
      videoRef.current.muted = true
    }
    startPreview()
  }

  const upload = async () => {
    if (!blob) return
    setState('uploading')

    try {
      const form = new FormData()
      form.append('video', blob, 'journal.webm')

      const res = await fetch('/api/entries', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const { id } = await res.json()
      navigate(`/entry/${id}`)
    } catch (err) {
      setError('Upload failed. Make sure the server is running.')
      setState('error')
    }
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, fontStyle: 'italic' }}>"{tip}"</p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <video ref={videoRef} className="record-video" playsInline />

        <div style={{ padding: '20px 24px' }}>
          {state === 'error' ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
              <button className="btn" onClick={startPreview}>Try again</button>
            </div>
          ) : state === 'uploading' ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
              <div className="spinner" />
              <span style={{ color: 'var(--text-muted)' }}>Uploading and processing…</span>
            </div>
          ) : state === 'done' ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn" onClick={retake}>Retake</button>
              <button className="btn btn-primary" onClick={upload}>
                Save entry →
              </button>
            </div>
          ) : (
            <div className="record-controls">
              {state === 'recording' && (
                <span className="timer">{formatTime(elapsed)}</span>
              )}
              <button
                className={`record-btn ${state === 'recording' ? 'recording' : ''}`}
                onClick={state === 'recording' ? stopRecording : startRecording}
                disabled={state === 'idle'}
              >
                {state === 'recording'
                  ? <div className="record-square" />
                  : <div className="record-dot" />
                }
              </button>
              {state === 'recording' && (
                <span style={{ fontSize: 13, color: 'var(--danger)', minWidth: 60 }}>Recording</span>
              )}
            </div>
          )}

          {(state === 'previewing' || state === 'idle') && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-hint)', marginTop: 12 }}>
              Press the button to start recording
            </p>
          )}
        </div>
      </div>

      {state === 'done' && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-hint)', marginTop: 16 }}>
          {formatTime(elapsed)} recorded · AI will analyze your emotions and summarize your entry
        </p>
      )}
    </div>
  )
}
