import React, { useContext } from 'react'
import { VoiceDataContext } from '../context/VoiceContext'

const AiVoiceButton = () => {
    const { isListening, voiceEnabled, setVoiceEnabled } = useContext(VoiceDataContext)

    const handleClick = () => {
        if (window.startVoiceListening) {
            window.startVoiceListening()
        }
    }

    const toggleVoice = (e) => {
        e.stopPropagation()
        setVoiceEnabled(!voiceEnabled)
    }

    return (
        <div className='fixed lg:bottom-[20px] md:bottom-[40px] bottom-[80px] left-[2%] z-[9999]'>
            <div className='relative'>
                {/* Toggle voice on/off - small icon */}
                <button
                    onClick={toggleVoice}
                    className='absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center text-xs z-10'
                    title={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
                >
                    {voiceEnabled ? '🔊' : '🔇'}
                </button>

                {/* Main AI button */}
                <button
                    onClick={handleClick}
                    disabled={!voiceEnabled}
                    className={`
                        relative
                        w-[60px] sm:w-[70px] md:w-[80px] lg:w-[90px] 
                        h-[60px] sm:h-[70px] md:h-[80px] lg:h-[90px]
                        rounded-full
                        bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600
                        flex items-center justify-center
                        cursor-pointer
                        transition-all duration-300
                        ${isListening 
                            ? 'scale-125 shadow-[0_0_40px_rgba(0,210,252,0.8)] animate-pulse' 
                            : 'scale-100 shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-110'
                        }
                        ${!voiceEnabled && 'opacity-50 cursor-not-allowed'}
                    `}
                    style={{
                        boxShadow: isListening 
                            ? '0 0 40px rgba(0, 210, 252, 0.8), 0 0 20px rgba(0, 210, 252, 0.5)' 
                            : '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Microphone icon */}
                    <svg
                        className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white ${isListening && 'animate-bounce'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                    </svg>

                    {/* Listening indicator rings */}
                    {isListening && (
                        <>
                            <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-75 animate-ping"></span>
                            <span className="absolute inset-0 rounded-full bg-cyan-400 opacity-50 animate-pulse"></span>
                        </>
                    )}
                </button>

                {/* Status text */}
                <div className='absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap'>
                    <span className={`text-xs sm:text-sm font-medium ${isListening ? 'text-cyan-500' : 'text-gray-600'}`}>
                        {isListening ? 'Listening...' : 'Voice AI'}
                    </span>
                </div>
            </div>

            {/* Help tooltip */}
            <div className='absolute bottom-full left-0 mb-4 w-64 bg-white rounded-lg shadow-xl p-4 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none hover:pointer-events-auto'>
                <h4 className='font-bold text-sm mb-2'>Voice Commands:</h4>
                <ul className='text-xs space-y-1 text-gray-700'>
                    <li>• "Fill pick up" - Set pickup location</li>
                    <li>• "Fill destination" - Set destination</li>
                    <li>• "Find trip" - Search for ride</li>
                    <li>• "Select car" (or auto/moto/bike)</li>
                    <li>• "Confirm" / "Yes" / "Okay" - Book ride</li>
                    <li>• "Fill email" - Enter email</li>
                    <li>• "Go home" - Navigate to home</li>
                </ul>
            </div>
        </div>
    )
}

export default AiVoiceButton
