import React, { useContext, useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import FinishRide from '../components/FinishRide'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import LiveTracking from '../components/LiveTracking'
import RideCommunication from '../components/RideCommunication'
import { CaptainDataContext } from '../context/CapatainContext'
import { SocketContext } from '../context/SocketContext'
import axios from 'axios'
import { calculateDistance } from '../utils/distance'

const CaptainRiding = () => {

    const [ finishRidePanel, setFinishRidePanel ] = useState(false)
    const finishRidePanelRef = useRef(null)
    const location = useLocation()
    const rideData = location.state?.ride
    const { captain } = useContext(CaptainDataContext)
    const { socket } = useContext(SocketContext)
    const navigate = useNavigate()
    const riderName = rideData?.user?.fullname?.firstname || 'Rider'
    const rideFare = Number(rideData?.fare ?? 0)
    const pickupAddress = rideData?.pickup || 'Pickup not available'
    const destinationAddress = rideData?.destination || 'Destination not available'
    const captainName = `${captain?.fullname?.firstname || ''} ${captain?.fullname?.lastname || ''}`.trim() || 'Captain'
    const [ captainLocation, setCaptainLocation ] = useState(null)
    const [ destinationLocation, setDestinationLocation ] = useState(null)
    const [ captainCloseToDestination, setCaptainCloseToDestination ] = useState(false)
    const [ rideCompleted, setRideCompleted ] = useState(false)
    const [ completedRideData, setCompletedRideData ] = useState(null)



    useGSAP(function () {
        if (finishRidePanel) {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ finishRidePanel ])

    useEffect(() => {
        if (!socket || !captain?._id) {
            return
        }

        socket.emit('join', {
            userId: captain._id,
            userType: 'captain'
        })
    }, [ socket, captain?._id ])

    const handleRideFinishedLocally = (ridePayload) => {
        if (ridePayload) {
            setCompletedRideData(ridePayload)
        }

        setFinishRidePanel(false)
        setRideCompleted(true)

        setTimeout(() => {
            navigate('/captain-home')
        }, 3000)
    }

    useEffect(() => {
        if (!socket) {
            return
        }

        // Get destination coordinates
        const fetchDestinationCoords = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: destinationAddress },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                setDestinationLocation({ lat: response.data.ltd, lng: response.data.lng })
            } catch (err) {
                console.log('Failed to fetch destination coords')
            }
        }
        fetchDestinationCoords()

        // Listen for location updates (simulated or real-time from other client)
        const handleLocationUpdate = (data) => {
            if (rideCompleted) {
                return
            }

            if (data.location) {
                const newLoc = { lat: data.location.latitude || data.location.lat, lng: data.location.longitude || data.location.lng }
                // Only update if from user (don't overwrite own position)
                if (data.senderType === 'user') {
                    setCaptainLocation(newLoc)
                }
            }
        }

        // Track captain's location via geolocation
        const watchId = navigator.geolocation.watchPosition((position) => {
            const captainPos = { lat: position.coords.latitude, lng: position.coords.longitude }
            setCaptainLocation(captainPos)

            // Check distance to destination
            if (destinationLocation) {
                const distance = calculateDistance(captainPos.lat, captainPos.lng, destinationLocation.lat, destinationLocation.lng)
                if (distance < 100 && !captainCloseToDestination) {
                    setCaptainCloseToDestination(true)
                    alert(`🎉 You are close to the destination! Distance: ${Math.round(distance)}m`)
                }
            }
        }, (error) => {
            console.log('Geolocation error:', error.message)
        })

        socket.on('ride-location-update', handleLocationUpdate)

        const handleRideEnded = (payload) => {
            const payloadRideId = payload?.data?._id || payload?._id || payload?.rideId
            if (!payloadRideId || String(payloadRideId) !== String(rideData?._id)) {
                return
            }

            if (payload?.data) {
                setCompletedRideData(payload.data)
            }

            // Check if captain reached destination (within 100m)
            if (captainLocation && destinationLocation) {
                const distance = calculateDistance(captainLocation.lat, captainLocation.lng, destinationLocation.lat, destinationLocation.lng)
                console.log('Distance to destination:', distance)
                if (distance > 100) {
                    alert(`⚠️ Ride ended!\nYou are ${Math.round(distance)}m away from the destination.`)
                }
            }
            
            // Show ride completion screen
            setFinishRidePanel(false)
            setRideCompleted(true)
            
            // Auto-navigate after 3 seconds
            setTimeout(() => {
                navigate('/captain-home')
            }, 3000)
        }

        socket.on('ride-ended', handleRideEnded)

        return () => {
            socket.off('ride-location-update', handleLocationUpdate)
            socket.off('ride-ended', handleRideEnded)
            navigator.geolocation.clearWatch(watchId)
        }
    }, [ socket, navigate, destinationAddress, captainCloseToDestination, rideData?._id, rideCompleted ])


    return (
        <div className='h-screen bg-slate-100 p-4 md:p-6 relative overflow-hidden'>
            <div className='h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4'>
                <div className='relative rounded-2xl overflow-hidden shadow-xl bg-white h-[50vh] lg:h-full'>
                    <div className='absolute top-4 left-4 z-40 bg-white/95 rounded-xl px-4 py-2 shadow-md'>
                        <h2 className='text-lg font-bold'>MoveInSync</h2>
                        <p className='text-xs text-gray-500'>Captain riding live view</p>
                    </div>
                    <Link to='/captain-home' className='absolute top-4 right-4 z-40 h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md'>
                        <i className="text-lg font-medium ri-home-5-line"></i>
                    </Link>
                    {!rideCompleted && (
                        <LiveTracking
                            pickup={rideData?.pickup}
                            destination={rideData?.destination}
                            markersDraggable={false}
                            rideId={rideData?._id}
                            actorType='captain'
                            isRideCompleted={rideCompleted}
                        />
                    )}
                </div>

                <div className='rounded-2xl bg-white shadow-xl p-6 flex flex-col overflow-y-auto'>
                    <div>
                        <h4 className='text-2xl font-semibold'>Active Ride</h4>
                        <p className='text-sm text-gray-500 mt-1'>Complete the trip after reaching destination</p>
                    </div>

                    <div className='mt-5 space-y-3'>
                        <div className='bg-gray-100 rounded-xl p-3'>
                            <p className='text-xs text-gray-500'>Rider</p>
                            <p className='text-lg font-semibold capitalize'>{riderName}</p>
                        </div>
                        <div className='bg-gray-100 rounded-xl p-3'>
                            <p className='text-xs text-gray-500'>Pickup</p>
                            <p className='text-sm font-medium'>{pickupAddress}</p>
                        </div>
                        <div className='bg-gray-100 rounded-xl p-3'>
                            <p className='text-xs text-gray-500'>Destination</p>
                            <p className='text-sm font-medium'>{destinationAddress}</p>
                        </div>
                        <div className='bg-gray-100 rounded-xl p-3 flex items-center justify-between'>
                            <div>
                                <p className='text-xs text-gray-500'>Fare</p>
                                <p className='text-lg font-semibold'>₹{rideFare}</p>
                            </div>
                            <button
                                onClick={() => setFinishRidePanel(true)}
                                className='bg-green-600 text-white font-semibold px-5 py-2 rounded-lg'>
                                Complete Ride
                            </button>
                        </div>

                        <RideCommunication
                            ride={rideData}
                            senderId={captain?._id}
                            senderType='captain'
                            senderName={captainName}
                        />
                    </div>
                </div>
            </div>

            <div ref={finishRidePanelRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-6 pt-12 relative'>
                    <FinishRide
                        ride={rideData}
                        setFinishRidePanel={setFinishRidePanel}
                        onRideFinished={handleRideFinishedLocally}
                    />
                </div>
            </div>

            {rideCompleted && (
                <div className='absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
                    <div className='bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm'>
                        <div className='mb-6'>
                            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                                <i className="text-4xl text-green-600 ri-check-line"></i>
                            </div>
                            <h2 className='text-3xl font-bold text-gray-900'>Ride Completed!</h2>
                            <p className='text-gray-600 mt-2'>Great job! Trip delivered successfully</p>
                        </div>

                        <div className='bg-gray-100 rounded-xl p-4 mb-6 space-y-2'>
                            <div className='flex justify-between'>
                                <span className='text-gray-600'>Rider:</span>
                                <span className='font-semibold capitalize'>{riderName}</span>
                            </div>
                            <div className='flex justify-between border-t pt-2'>
                                <span className='text-gray-600'>Destination:</span>
                                <span className='font-semibold'>{destinationAddress}</span>
                            </div>
                            <div className='flex justify-between border-t pt-2'>
                                <span className='text-gray-600'>Earned:</span>
                                <span className='font-semibold text-green-600'>₹{rideFare}</span>
                            </div>
                        </div>

                        <p className='text-sm text-gray-500 mb-4'>Redirecting to home in 3 seconds...</p>
                        
                        <button
                            onClick={() => navigate('/captain-home')}
                            className='w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition'
                        >
                            Go to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default CaptainRiding