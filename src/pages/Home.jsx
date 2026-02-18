import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'

function Home() {
    const [preview, setPreview] = useState(null)
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)
    const [langFrom, setLangFrom] = useState('Ukrainian')
    const [langTo, setLangTo] = useState('English')
    const [result, setResult] = useState(null)
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
        setResult(null)
    }

    const cropImage = (imageSrc, bbox) => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const [ymin, xmin, ymax, xmax] = bbox
                const startX = (xmin / 1000) * img.width
                const startY = (ymin / 1000) * img.height
                const width = ((xmax - xmin) / 1000) * img.width
                const height = ((ymax - ymin) / 1000) * img.height

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg'))
            }
            img.src = imageSrc
        })
    }

    const analyzeImage = async () => {
        if (!preview) return alert('Upload image first')
        setLoading(true)
        setResult({ textFrom: 'Analyzing...', textTo: '...', thumbnail: null })

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
                            {
                                type: 'text',
                                text: `Analyze the object at X:${x}% Y:${y}%. 
                                Provide the result in two languages:
                                - "textFrom": Name in ${langFrom}
                                - "textTo": Name in ${langTo}
                                - "bbox": [ymin, xmin, ymax, xmax] (0-1000 scaled).
                                Respond ONLY with the JSON object.`
                            },
                            { type: 'image_url', image_url: { url: preview } }
                        ]
                    }],
                    response_format: { type: "json_object" }
                })
            })
            const data = await response.json()
            const parsed = JSON.parse(data.choices[0].message.content)

            const thumbnail = await cropImage(preview, parsed.bbox)

            setResult({
                ...parsed,
                thumbnail
            })
        } catch (err) {
            alert('Error: ' + err.message)
            setResult(null)
        } finally {
            setLoading(false)
        }
    }

    const saveToDictionary = () => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        const newItem = {
            id: Date.now(),
            image: result.thumbnail || preview,
            x,
            y,
            result: `${result.textFrom} - ${result.textTo}`,
            language: `${langFrom} -> ${langTo}`,
            date: new Date().toLocaleString()
        }
        localStorage.setItem('dictionary', JSON.stringify([newItem, ...saved]))
        alert('Saved to dictionary!')
    }

    return (
        <main>
            <nav>
                <Link to="/dictionary">Відкрити словник</Link>
            </nav>

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

            <div>
                <label>X (%): <input type="number" value={x} onChange={e => setX(e.target.value)} /></label>
                <label>Y (%): <input type="number" value={y} onChange={e => setY(e.target.value)} /></label>

                <div>
                    <span>З: </span>
                    <select value={langFrom} onChange={e => setLangFrom(e.target.value)}>
                        <option value="Ukrainian">Ukrainian</option>
                        <option value="English">English</option>
                    </select>
                    <span> На: </span>
                    <select value={langTo} onChange={e => setLangTo(e.target.value)}>
                        <option value="English">English</option>
                        <option value="Ukrainian">Ukrainian</option>
                    </select>
                </div>

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
                            zIndex: 3,
                            background: 'white',
                            padding: '5px',
                            border: '1px solid black'
                        }}>
                            <strong>Result:</strong>
                            {result.thumbnail && (
                                <div>
                                    <img src={result.thumbnail} alt="crop" style={{ width: '80px', display: 'block' }} />
                                </div>
                            )}
                            <div>{result.textFrom}</div>
                            <div>{result.textTo}</div>

                            {!loading && (
                                <button onClick={saveToDictionary}>
                                    Зберегти в словник
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </main>
    )
}

export default Home
