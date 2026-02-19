import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

function Dictionary() {
    const [items, setItems] = useState([])

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('dictionary') || '[]')
        setItems(saved)
    }, [])

    const deleteItem = (id) => {
        const updated = items.filter(item => item.id !== id)
        setItems(updated)
        localStorage.setItem('dictionary', JSON.stringify(updated))
    }

    return (
        <main>
            <nav>
                <Link to="/">← Назад до аналізу</Link>
            </nav>

            <h1>Ваші збережені результати</h1>

            {items.length === 0 ? (
                <p>У словнику поки що немає записів.</p>
            ) : (
                <ul>
                    {items.map(item => (
                        <li key={item.id}>
                            <div>
                                <img src={item.image} alt="thumbnail" style={{ width: '100px' }} />
                                <span>X:{item.x}% Y:{item.y}%</span>
                            </div>
                            <div>
                                <small>{item.date}</small>
                                <p><strong>{item.language}:</strong> {item.result}</p>
                                <button onClick={() => deleteItem(item.id)}>Видалити</button>
                            </div>
                            <hr />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    )
}

export default Dictionary
