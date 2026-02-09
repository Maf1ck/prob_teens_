import { useState } from 'react'

function App() {
  const [preview, setPreview] = useState(null)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [language, setLanguage] = useState('English')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect()
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setX(xPct)
    setY(yPct)
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
      </div>

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
            pointerEvents: 'none'
          }}></div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <strong>Result:</strong>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{result}</pre>
        </div>
      )}
    </main>
  )
}

export default App
