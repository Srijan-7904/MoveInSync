import React, { createContext, useState, useCallback, useRef } from 'react'

export const VoiceDataContext = createContext()

const VoiceContext = ({ children }) => {
    const [isListening, setIsListening] = useState(false)
    const [voiceEnabled, setVoiceEnabled] = useState(true)
    const [currentCommand, setCurrentCommand] = useState('')
    const [fillMode, setFillMode] = useState(null) // Which field to fill: 'pickup', 'destination', 'email', etc.
    const recognitionRef = useRef(null)

    // Initialize Speech Recognition
    const initRecognition = useCallback(() => {
        if (!recognitionRef.current) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = false
                recognitionRef.current.lang = 'en-US'
            }
        }
        return recognitionRef.current
    }, [])

    // Text to Speech
    const speak = useCallback((message) => {
        if (!voiceEnabled) return
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        window.speechSynthesis.speak(utterance)
    }, [voiceEnabled])

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
        }
        setIsListening(false)
        setFillMode(null)
    }, [])

    return (
        <VoiceDataContext.Provider
            value={{
                isListening,
                setIsListening,
                voiceEnabled,
                setVoiceEnabled,
                currentCommand,
                setCurrentCommand,
                fillMode,
                setFillMode,
                speak,
                initRecognition,
                stopListening,
                recognitionRef
            }}
        >
            {children}
        </VoiceDataContext.Provider>
    )
}

export default VoiceContext
