import React, { useContext, useEffect, useCallback } from 'react'
import { VoiceDataContext } from '../context/VoiceContext'
import { useNavigate, useLocation } from 'react-router-dom'

const VoiceAssistant = ({ 
    onPickupFill, 
    onDestinationFill, 
    onEmailFill, 
    onPasswordFill,
    onFirstNameFill,
    onLastNameFill,
    onPhoneFill,
    onConfirmAction,
    onVehicleSelect
}) => {
    const {
        isListening,
        setIsListening,
        speak,
        initRecognition,
        stopListening,
        fillMode,
        setFillMode
    } = useContext(VoiceDataContext)

    const navigate = useNavigate()
    const location = useLocation()

    const recognition = initRecognition()

    // Convert spoken email to text format
    const convertSpokenToEmail = (spoken) => {
        let email = spoken
            .replace(/\s+at\s+/g, '@')
            .replace(/\s+dot\s+/g, '.')
            .replace(/\s+/g, '')
        return email
    }

    // Start listening function
    const startListening = useCallback(() => {
        if (!recognition) {
            speak('Voice recognition not supported')
            return
        }

        try {
            recognition.start()
            setIsListening(true)
        } catch (error) {
            console.error('Recognition error:', error)
        }
    }, [recognition, speak, setIsListening])

    const handleFieldFill = useCallback((transcript) => {
        switch (fillMode) {
            case 'pickup':
                if (onPickupFill) {
                    onPickupFill(transcript)
                    speak('Pickup location set')
                }
                break
            case 'destination':
                if (onDestinationFill) {
                    onDestinationFill(transcript)
                    speak('Destination set')
                }
                break
            case 'email':
                if (onEmailFill) {
                    // Convert spoken email to proper format
                    const email = convertSpokenToEmail(transcript)
                    onEmailFill(email)
                    speak('Email filled')
                }
                break
            case 'password':
                if (onPasswordFill) {
                    onPasswordFill(transcript)
                    speak('Password entered')
                }
                break
            case 'firstname':
                if (onFirstNameFill) {
                    onFirstNameFill(transcript)
                    speak('First name entered')
                }
                break
            case 'lastname':
                if (onLastNameFill) {
                    onLastNameFill(transcript)
                    speak('Last name entered')
                }
                break
            case 'phone':
                if (onPhoneFill) {
                    // Extract numbers from speech
                    const phone = transcript.replace(/\D/g, '')
                    onPhoneFill(phone)
                    speak('Phone number entered')
                }
                break
        }
        setFillMode(null)
    }, [fillMode, onPickupFill, onDestinationFill, onEmailFill, onPasswordFill, onFirstNameFill, onLastNameFill, onPhoneFill, speak, setFillMode, convertSpokenToEmail])

    const handleCommand = useCallback((transcript) => {
        // Confirmation commands (check for confirm anywhere in the transcript)
        if ((transcript.includes('confirm') || transcript.includes('confirmed') || 
             transcript.includes('yes') || transcript.includes('submit') || 
             transcript.includes('okay') || transcript.includes('ok')) && onConfirmAction) {
            speak('Confirming')
            onConfirmAction()
            return
        }

        // Find Trip command
        if ((transcript.includes('find trip') || transcript.includes('find a trip') || 
             transcript.includes('search trip') || transcript.includes('search for trip') || 
             transcript.includes('book trip') || transcript.includes('get trip')) && onConfirmAction) {
            speak('Finding trip')
            onConfirmAction()
            return
        }

        // Cancel/Clear commands
        if (transcript.includes('cancel') || transcript.includes('clear') || transcript.includes('reset')) {
            speak('Cancelled')
            setFillMode(null)
            return
        }

        // Field filling commands (support both "pickup" and "pick up", and common misheard versions of "fill")
        if (transcript.includes('fill pickup') || transcript.includes('fill pick up') || 
            transcript.includes('field pickup') || transcript.includes('field pick up') ||
            transcript.includes('film pickup') || transcript.includes('film pick up') ||
            transcript.includes('feel pickup') || transcript.includes('feel pick up') ||
            transcript.includes('enter pickup') || transcript.includes('enter pick up') || 
            transcript.includes('pickup location') || transcript.includes('pick up location') || 
            transcript.includes('set pickup') || transcript.includes('set pick up') ||
            (transcript.includes('pickup') && (transcript.includes('fill') || transcript.includes('field') || transcript.includes('film') || transcript.includes('feel') || transcript.includes('enter') || transcript.includes('set'))) ||
            (transcript.includes('pick up') && (transcript.includes('fill') || transcript.includes('field') || transcript.includes('film') || transcript.includes('feel') || transcript.includes('enter') || transcript.includes('set')))) {
            speak('Please say the pickup location')
            setFillMode('pickup')
            startListening()
            return
        }

        if (transcript.includes('fill destination') || transcript.includes('field destination') || transcript.includes('film destination') || transcript.includes('feel destination') ||
            transcript.includes('enter destination') || transcript.includes('where to') || transcript.includes('set destination') || 
            (transcript.includes('destination') && (transcript.includes('fill') || transcript.includes('field') || transcript.includes('film') || transcript.includes('feel') || transcript.includes('enter') || transcript.includes('set')))) {
            speak('Please say the destination')
            setFillMode('destination')
            startListening()
            return
        }

        if (transcript.includes('fill email') || transcript.includes('field email') || transcript.includes('film email') || transcript.includes('feel email') || transcript.includes('enter email')) {
            speak('Please say your email address')
            setFillMode('email')
            startListening()
            return
        }

        if (transcript.includes('fill password') || transcript.includes('field password') || transcript.includes('film password') || transcript.includes('feel password') || transcript.includes('enter password')) {
            speak('Please say your password')
            setFillMode('password')
            startListening()
            return
        }

        if (transcript.includes('fill first name') || transcript.includes('field first name') || transcript.includes('film first name') || transcript.includes('enter first name')) {
            speak('Please say your first name')
            setFillMode('firstname')
            startListening()
            return
        }

        if (transcript.includes('fill last name') || transcript.includes('field last name') || transcript.includes('film last name') || transcript.includes('enter last name')) {
            speak('Please say your last name')
            setFillMode('lastname')
            startListening()
            return
        }

        if (transcript.includes('fill phone') || transcript.includes('field phone') || transcript.includes('film phone') || transcript.includes('enter phone') || transcript.includes('phone number')) {
            speak('Please say your phone number')
            setFillMode('phone')
            startListening()
            return
        }

        // Vehicle selection commands (with speech recognition variations)
        if ((transcript.includes('select car') || transcript.includes('select kar') || transcript.includes('select kaar') ||
             transcript.includes('choose car') || transcript.includes('choose kar') || 
             transcript.includes('book car') || transcript.includes('book kar')) && onVehicleSelect) {
            speak('Car selected')
            onVehicleSelect('car')
            return
        }

        if ((transcript.includes('select auto') || transcript.includes('select otto') || 
             transcript.includes('choose auto') || transcript.includes('choose otto') || 
             transcript.includes('book auto') || transcript.includes('book otto')) && onVehicleSelect) {
            speak('Auto selected')
            onVehicleSelect('auto')
            return
        }

        if ((transcript.includes('select moto') || transcript.includes('select motorcycle') || 
             transcript.includes('select motor') || transcript.includes('select bike') ||
             transcript.includes('choose moto') || transcript.includes('choose motorcycle') || 
             transcript.includes('choose bike') ||
             transcript.includes('book moto') || transcript.includes('book motorcycle') || 
             transcript.includes('book bike')) && onVehicleSelect) {
            speak('Motorcycle selected')
            onVehicleSelect('motorcycle')
            return
        }

        // Navigation commands
        if (transcript.includes('home') || transcript.includes('go home')) {
            speak('Opening home page')
            navigate('/home')
            return
        }

        if (transcript.includes('login') || transcript.includes('sign in')) {
            speak('Opening login page')
            navigate('/login')
            return
        }

        if (transcript.includes('signup') || transcript.includes('sign up') || transcript.includes('register')) {
            speak('Opening signup page')
            navigate('/signup')
            return
        }

        if (transcript.includes('captain login')) {
            speak('Opening captain login')
            navigate('/captain-login')
            return
        }

        if (transcript.includes('captain signup') || transcript.includes('captain register')) {
            speak('Opening captain signup')
            navigate('/captain-signup')
            return
        }

        if (transcript.includes('logout') || transcript.includes('sign out')) {
            speak('Logging out')
            if (location.pathname.includes('captain')) {
                navigate('/captain-logout')
            } else {
                navigate('/user-logout')
            }
            return
        }

        // If no command matched
        console.log('Unrecognized command:', transcript)
        speak('Command not recognized. Try saying fill pickup, fill destination, select car, find trip, confirm, or go home')
    }, [speak, setFillMode, startListening, navigate, location.pathname, onConfirmAction, onVehicleSelect])

    // Handle voice recognition results
    const handleResult = useCallback((transcript) => {
        const lowerTranscript = transcript.toLowerCase().trim()
        console.log('Voice command:', lowerTranscript)

        // Fill mode - capturing field values
        if (fillMode) {
            handleFieldFill(lowerTranscript)
            return
        }

        // Command mode - navigation and actions
        handleCommand(lowerTranscript)
    }, [fillMode, handleFieldFill, handleCommand])

    // Setup recognition event handlers
    useEffect(() => {
        if (!recognition) return

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim()
            handleResult(transcript)
        }

        recognition.onend = () => {
            setIsListening(false)
            if (!fillMode) {
                // Don't automatically restart
            }
        }

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            setIsListening(false)
            setFillMode(null)
            
            if (event.error === 'no-speech') {
                speak('No speech detected. Please try again.')
            } else if (event.error === 'not-allowed') {
                speak('Microphone access denied')
            }
        }

        return () => {
            if (recognition) {
                recognition.onresult = null
                recognition.onend = null
                recognition.onerror = null
            }
        }
    }, [recognition, handleResult, fillMode, setIsListening, setFillMode, speak])

    // Expose start listening to parent
    useEffect(() => {
        window.startVoiceListening = startListening
        window.stopVoiceListening = stopListening
    }, [startListening, stopListening])

    return null // This is a headless component
}

export default VoiceAssistant

