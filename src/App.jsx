import { useState, useRef } from 'react'

function App() {
  const [preview, setPreview] = useState(null)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [language, setLanguage] = useState('English')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setShowCamera(true)
    } catch (err) {
      alert('Camera access denied: ' + err.message)
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      alert('Video not ready')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPreview(dataUrl)
    stopCamera()
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect()
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setX(xPct)
    setY(yPct)
    setResult('') 
  }

  const analyzeImage = async () => {
    if (!preview) return alert('Upload image first')
    setLoading(true)
    setResult('Analyzing...')

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-5.2',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `What is at X:${x}% Y:${y}%? Answer in ${language}, names in ${language}.` },
              { type: 'image_url', image_url: { url: preview } }
            ]
          }]
        })
      })
      const data = await response.json()
      setResult(data.choices[0].message.content)
    } catch (err) {
      setResult('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>

      <div>
        <input type="file" onChange={handleImageUpload} accept="image/*" />
        <button onClick={startCamera}>📷 Take Photo</button>
      </div>

      {showCamera && (
        <div>
          <video ref={videoRef} autoPlay style={{ maxWidth: '100%' }}></video>
          <div>
            <button onClick={capturePhoto}>Capture</button>
            <button onClick={stopCamera}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ margin: '10px 0' }}>
        <label>X (%): <input type="number" value={x} onChange={e => setX(e.target.value)} /></label>
        <label>Y (%): <input type="number" value={y} onChange={e => setY(e.target.value)} /></label>
        <select value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="English">English</option>
          <option value="Ukrainian">Ukrainian</option>
        </select>
        <button onClick={analyzeImage} disabled={loading}>
          {loading ? '...' : 'Analyze'}
        </button>
      </div>

      {preview && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            onClick={handleImageClick}
            alt="preview"
            style={{ maxWidth: '100%', cursor: 'crosshair' }}
          />
          <div style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: '10px',
            height: '10px',
            background: 'red',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 2
          }}></div>

          {result && (
            <div style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(10px, 10px)',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '10px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              maxWidth: '200px',
              zIndex: 3,
              fontSize: '14px',
              border: '1px solid #ccc'
            }}>
              <strong>Result:</strong>
              <div style={{ whiteSpace: 'pre-wrap' }}>{result}</div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default App
