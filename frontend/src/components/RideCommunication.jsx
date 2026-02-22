import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SocketContext } from '../context/SocketContext'
import axios from 'axios'
import { calculateDistance } from '../utils/distance'

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
}

const RideCommunication = ({ ride, senderId, senderType, senderName }) => {
    const { socket } = useContext(SocketContext)

    const rideId = ride?._id
    const resolvedSenderType = senderType || 'user'
    const resolvedSenderName = senderName || (resolvedSenderType === 'captain' ? 'Captain' : 'User')

    const [ messageInput, setMessageInput ] = useState('')
    const [ messages, setMessages ] = useState([])
    const [ chatOpen, setChatOpen ] = useState(false)
    const [ destinationLocation, setDestinationLocation ] = useState(null)
    const [ popupNotification, setPopupNotification ] = useState(null)

    const [ callStatus, setCallStatus ] = useState('idle')
    const [ isMuted, setIsMuted ] = useState(false)
    const [ pendingOffer, setPendingOffer ] = useState(null)
    const [ callDuration, setCallDuration ] = useState(0)
    const [ callTimerId, setCallTimerId ] = useState(null)

    const peerConnectionRef = useRef(null)
    const localStreamRef = useRef(null)
    const remoteStreamRef = useRef(null)
    const systemPopupsShownRef = useRef(new Set())
    const popupTimerRef = useRef(null)

    const canUseCommunication = useMemo(() => Boolean(socket && rideId), [ socket, rideId ])

    const showSystemPopup = (messageKey, messageText) => {
        const scopedMessageKey = `${rideId || 'unknown'}:${messageKey}`

        if (systemPopupsShownRef.current.has(scopedMessageKey)) {
            return
        }

        systemPopupsShownRef.current.add(scopedMessageKey)
        setPopupNotification({
            key: messageKey,
            message: messageText
        })

        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current)
        }

        popupTimerRef.current = setTimeout(() => {
            setPopupNotification(null)
            popupTimerRef.current = null
        }, 3500)
    }

    const getRideIdFromPayload = (payload) => {
        return payload?._id || payload?.data?._id || payload?.ride?._id || null
    }

    const isCurrentRidePayload = (payload) => {
        const payloadRideId = getRideIdFromPayload(payload)
        return Boolean(payloadRideId && rideId && String(payloadRideId) === String(rideId))
    }

    const ensureRemoteStream = () => {
        if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream()
        }
    }

    const destroyPeerConnection = () => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.onicecandidate = null
            peerConnectionRef.current.ontrack = null
            peerConnectionRef.current.close()
            peerConnectionRef.current = null
        }
    }

    const stopLocalStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop())
            localStreamRef.current = null
        }
    }

    const clearRemoteStream = () => {
        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach((track) => track.stop())
            remoteStreamRef.current = null
        }
    }

    const cleanupCallState = () => {
        destroyPeerConnection()
        stopLocalStream()
        clearRemoteStream()
        setPendingOffer(null)
        setCallStatus('idle')
        setIsMuted(false)
        stopCallTimer()
    }

    const stopCallTimer = () => {
        if (callTimerId) {
            clearInterval(callTimerId)
            setCallTimerId(null)
        }

        setCallDuration(0)
    }

    const startCallTimer = () => {
        if (callTimerId) {
            clearInterval(callTimerId)
        }

        const timerId = setInterval(() => {
            setCallDuration((prev) => prev + 1)
        }, 1000)

        setCallTimerId(timerId)
    }

    const formatCallDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hrs > 0) {
            return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        }
        return `${mins}:${String(secs).padStart(2, '0')}`
    }

    const setupPeerConnection = async () => {
        if (peerConnectionRef.current) {
            return peerConnectionRef.current
        }

        const pc = new RTCPeerConnection(iceServers)

        pc.onicecandidate = (event) => {
            if (!event.candidate || !rideId) {
                return
            }

            socket.emit('ride-webrtc-signal', {
                rideId,
                signalType: 'ice-candidate',
                signalData: event.candidate,
                fromType: resolvedSenderType,
                fromName: resolvedSenderName
            })
        }

        pc.ontrack = (event) => {
            ensureRemoteStream()
            event.streams[ 0 ]?.getTracks().forEach((track) => {
                remoteStreamRef.current.addTrack(track)
            })
            setCallStatus('in-call')
            startCallTimer()
        }

        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = localStream

        localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream)
        })

        peerConnectionRef.current = pc
        return pc
    }

    const startCall = async () => {
        if (!canUseCommunication || callStatus === 'in-call' || callStatus === 'calling') {
            return
        }

        try {
            setCallStatus('calling')
            const pc = await setupPeerConnection()
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            socket.emit('ride-webrtc-signal', {
                rideId,
                signalType: 'offer',
                signalData: offer,
                fromType: resolvedSenderType,
                fromName: resolvedSenderName
            })
        } catch {
            cleanupCallState()
        }
    }

    const acceptIncomingCall = async () => {
        if (!pendingOffer || !canUseCommunication) {
            return
        }

        try {
            setCallStatus('connecting')
            const pc = await setupPeerConnection()
            await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer))

            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            socket.emit('ride-webrtc-signal', {
                rideId,
                signalType: 'answer',
                signalData: answer,
                fromType: resolvedSenderType,
                fromName: resolvedSenderName
            })

            setPendingOffer(null)
        } catch {
            cleanupCallState()
        }
    }

    const rejectIncomingCall = () => {
        if (!canUseCommunication) {
            return
        }

        socket.emit('ride-call-ended', {
            rideId,
            endedBy: resolvedSenderType
        })
        cleanupCallState()
    }

    const endCall = () => {
        if (canUseCommunication) {
            socket.emit('ride-call-ended', {
                rideId,
                endedBy: resolvedSenderType
            })
        }

        cleanupCallState()
    }

    const toggleMute = () => {
        if (!localStreamRef.current) {
            return
        }

        const audioTrack = localStreamRef.current.getAudioTracks()[ 0 ]
        if (!audioTrack) {
            return
        }

        const nextMuteState = !isMuted
        audioTrack.enabled = !nextMuteState
        setIsMuted(nextMuteState)
    }

    const sendMessage = () => {
        if (!canUseCommunication) {
            return
        }

        const trimmed = messageInput.trim()
        if (!trimmed) {
            return
        }

        socket.emit('ride-chat-message', {
            rideId,
            message: trimmed,
            senderId,
            senderType: resolvedSenderType,
            senderName: resolvedSenderName,
            timestamp: new Date().toISOString()
        })

        setMessageInput('')
    }

    useEffect(() => {
        let isCancelled = false

        const fetchDestination = async () => {
            if (!ride?.destination || ride.destination.trim().length < 3) {
                setDestinationLocation(null)
                return
            }

            try {
                const accessToken = localStorage.getItem('captain-token') || localStorage.getItem('token')
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: ride.destination },
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                })

                if (!isCancelled) {
                    setDestinationLocation({ lat: response.data.ltd, lng: response.data.lng })
                }
            } catch {
                if (!isCancelled) {
                    setDestinationLocation(null)
                }
            }
        }

        fetchDestination()

        return () => {
            isCancelled = true
        }
    }, [ ride?.destination ])

    useEffect(() => {
        systemPopupsShownRef.current = new Set()
    }, [ rideId ])

    useEffect(() => {
        if (!rideId) {
            return
        }

        if (ride?.captain) {
            showSystemPopup('ride-confirmed', '✅ Ride confirmed by captain.')
        }

        if (ride?.status === 'ongoing' || ride?.status === 'completed') {
            showSystemPopup('ride-started', '🚗 Ride started. Heading to destination.')
        }

        if (ride?.status === 'completed') {
            showSystemPopup('ride-ended', '🏁 Ride ended. Trip completed successfully.')
        }
    }, [ rideId, ride?.captain, ride?.status ])

    useEffect(() => {
        return () => {
            if (popupTimerRef.current) {
                clearTimeout(popupTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!canUseCommunication) {
            return
        }

        socket.emit('join-ride-room', {
            rideId,
            senderId,
            senderType: resolvedSenderType
        })

        const handleChatMessage = (payload) => {
            if (payload?.rideId !== rideId) {
                return
            }

            setMessages((prev) => [ ...prev, payload ])
        }

        const handleSignal = async (payload) => {
            if (payload?.rideId !== rideId) {
                return
            }

            const { signalType, signalData } = payload

            try {
                if (signalType === 'offer') {
                    setPendingOffer(signalData)
                    setCallStatus('incoming')
                    return
                }

                if (signalType === 'answer') {
                    if (!peerConnectionRef.current) {
                        return
                    }
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData))
                    setCallStatus('in-call')
                    return
                }

                if (signalType === 'ice-candidate') {
                    if (!peerConnectionRef.current || !signalData) {
                        return
                    }
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signalData))
                }
            } catch {
                cleanupCallState()
            }
        }

        const handleCallEnded = (payload) => {
            if (payload?.rideId !== rideId) {
                return
            }

            cleanupCallState()
        }

        const handleRideConfirmed = (payload) => {
            if (!isCurrentRidePayload(payload)) {
                return
            }

            showSystemPopup('ride-confirmed', '✅ Ride confirmed by captain.')
        }

        const handleRideStarted = (payload) => {
            if (!isCurrentRidePayload(payload)) {
                return
            }

            showSystemPopup('ride-started', '🚗 Ride started. Heading to destination.')
        }

        const handleRideLifecycleEnded = (payload) => {
            if (!isCurrentRidePayload(payload) && payload?.rideId !== rideId) {
                return
            }

            showSystemPopup('ride-ended', '🏁 Ride ended. Trip completed successfully.')
        }

        const handleLocationStatusUpdate = (payload) => {
            if (payload?.rideId !== rideId || payload?.senderType !== 'captain' || !destinationLocation) {
                return
            }

            const lat = Number(payload?.location?.lat)
            const lng = Number(payload?.location?.lng)

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return
            }

            const remainingDistance = calculateDistance(lat, lng, destinationLocation.lat, destinationLocation.lng)
            if (remainingDistance <= 100) {
                showSystemPopup('ride-near-destination', '📍 Reminder: less than 100m left to destination.')
            }
        }

        socket.on('ride-chat-message', handleChatMessage)
        socket.on('ride-webrtc-signal', handleSignal)
        socket.on('ride-call-ended', handleCallEnded)
        socket.on('ride-confirmed', handleRideConfirmed)
        socket.on('ride-started', handleRideStarted)
        socket.on('ride-ended', handleRideLifecycleEnded)
        socket.on('ride-location-update', handleLocationStatusUpdate)

        return () => {
            socket.off('ride-chat-message', handleChatMessage)
            socket.off('ride-webrtc-signal', handleSignal)
            socket.off('ride-call-ended', handleCallEnded)
            socket.off('ride-confirmed', handleRideConfirmed)
            socket.off('ride-started', handleRideStarted)
            socket.off('ride-ended', handleRideLifecycleEnded)
            socket.off('ride-location-update', handleLocationStatusUpdate)
            cleanupCallState()
        }
    }, [ canUseCommunication, rideId, senderId, resolvedSenderType, destinationLocation ])

    return (
        <>
            {popupNotification && (
                <div className='fixed top-4 right-4 z-[9999]'>
                    <div className='bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-xl px-4 py-3 shadow-xl min-w-[280px] max-w-[360px] text-center'>
                        <p className='text-sm font-semibold'>{popupNotification.message}</p>
                    </div>
                </div>
            )}

        <div className='fixed bottom-20 right-3 left-3 z-[70] lg:bottom-6 lg:left-auto lg:right-6 lg:w-[380px]'>
            {!chatOpen && (
                <div className='flex justify-end'>
                    <button
                        onClick={() => setChatOpen(true)}
                        className='bg-black text-white px-4 py-3 rounded-full shadow-2xl font-medium'
                    >
                        💬 Ride Chat
                    </button>
                </div>
            )}

            {chatOpen && (
                <div className='bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden'>
                    <div className='bg-gradient-to-r from-black to-gray-800 text-white p-4 flex items-center justify-between border-b-2 border-gray-300'>
                        <div>
                            <h3 className='font-bold text-lg'>🚗 Ride Chat</h3>
                            <p className='text-xs text-gray-300'>Stay connected</p>
                        </div>
                        <button
                            onClick={() => setChatOpen(false)}
                            className='text-2xl hover:bg-gray-700 p-2 rounded-lg transition font-bold'
                        >
                            ✕
                        </button>
                    </div>

                    <div className='bg-gray-100 p-3 space-y-2 border-b border-gray-200'>
                        <div className='flex gap-2'>
                            <button
                                onClick={startCall}
                                className='flex-1 text-sm px-3 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed'
                                disabled={!canUseCommunication || callStatus !== 'idle'}
                            >
                                ☎️ Start Call
                            </button>
                            <button
                                onClick={endCall}
                                className='flex-1 text-sm px-3 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed'
                                disabled={callStatus !== 'in-call'}
                            >
                                🛑 End
                            </button>
                        </div>

                        {callStatus === 'incoming' && (
                            <div className='bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center justify-between gap-2'>
                                <span className='text-sm font-semibold text-yellow-700'>📞 Incoming call...</span>
                                <div className='flex gap-2'>
                                    <button onClick={acceptIncomingCall} className='text-xs bg-green-600 text-white px-3 py-1 rounded font-medium hover:bg-green-700'>✓</button>
                                    <button onClick={rejectIncomingCall} className='text-xs bg-red-600 text-white px-3 py-1 rounded font-medium hover:bg-red-700'>✕</button>
                                </div>
                            </div>
                        )}

                        {callStatus === 'in-call' && (
                            <div className='bg-blue-50 border-l-4 border-blue-600 rounded-lg p-3 text-center'>
                                <div className='text-3xl font-bold text-blue-600'>{formatCallDuration(callDuration)}</div>
                                <p className='text-xs text-blue-600 mt-1'>Voice call active</p>
                            </div>
                        )}

                        <button
                            onClick={toggleMute}
                            className={`w-full text-sm px-3 py-2 rounded-lg font-medium transition ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-800'}`}
                        >
                            {isMuted ? '🔇 Unmute Mic' : '🎤 Mute Mic'}
                        </button>
                    </div>

                    <div className='h-64 overflow-y-auto bg-white p-4 space-y-3'>
                        {messages.length === 0 && (
                            <div className='h-full flex items-center justify-center'>
                                <p className='text-gray-400 text-sm text-center'>No messages yet<br/>Start a conversation!</p>
                            </div>
                        )}
                        {messages.map((item, index) => {
                            const mine = item.senderType === resolvedSenderType && item.senderName === resolvedSenderName
                            const timestamp = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                            return (
                                <div key={`${item.timestamp || index}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-xs ${mine ? 'bg-black text-white' : 'bg-gray-200 text-black'} rounded-2xl px-4 py-2 break-words`}>
                                        {!mine && <p className='text-xs font-semibold mb-1'>{item.senderName || 'User'}</p>}
                                        <p className='text-sm'>{item.message}</p>
                                        <p className={`text-xs mt-1 ${mine ? 'text-gray-300' : 'text-gray-600'}`}>{timestamp}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className='bg-white border-t border-gray-200 p-3 space-y-2'>
                        <div className='flex gap-2'>
                            <input
                                type='text'
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        sendMessage()
                                    }
                                }}
                                className='flex-1 border border-gray-300 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-black transition'
                                placeholder='Type a message...'
                                disabled={!canUseCommunication}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!canUseCommunication || !messageInput.trim()}
                                className='bg-black text-white px-4 py-2 rounded-2xl font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )
}

export default RideCommunication
