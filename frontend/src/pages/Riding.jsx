import React from 'react'
import { Link, useLocation } from 'react-router-dom' // Added useLocation
import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom'
import LiveTracking from '../components/LiveTracking'
import RideCommunication from '../components/RideCommunication'
import { UserDataContext } from '../context/UserContext'
import axios from 'axios'
import { useState } from 'react'
import { calculateDistance } from '../utils/distance'

const Riding = () => {
    const location = useLocation()
    const { ride } = location.state || {} // Retrieve ride data
    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)
    const navigate = useNavigate()
    const captainName = ride?.captain?.fullname?.firstname || 'Captain'
    const captainVehiclePlate = ride?.captain?.vehicle?.plate || 'N/A'
    const captainVehicleType = ride?.captain?.vehicle?.vehicleType || 'Vehicle'
    const destination = ride?.destination || 'Destination not available'
    const pickup = ride?.pickup || 'Pickup not available'
    const fare = Number(ride?.fare ?? 0)
    const otp = ride?.otp || '----'
    const userName = `${user?.fullname?.firstname || user?.fullName?.firstName || ''} ${user?.fullname?.lastname || user?.fullName?.lastName || ''}`.trim() || 'User'
    const [ paymentLoading, setPaymentLoading ] = useState(false)
    const [ paymentDone, setPaymentDone ] = useState(Boolean(ride?.paymentID))
    const [ captainLocation, setCaptainLocation ] = useState(null)
    const [ userLocation, setUserLocation ] = useState(null)
    const [ destinationLocation, setDestinationLocation ] = useState(null)
    const [ userCloseToPickup, setUserCloseToPickup ] = useState(false)
    const [ rideCompleted, setRideCompleted ] = useState(false)
    const [ completedRideData, setCompletedRideData ] = useState(null)

    useEffect(() => {
        if (!socket || !user?._id) {
            return
        }

        socket.emit('join', {
            userId: user._id,
            userType: 'user'
        })
    }, [ socket, user?._id ])

    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true)
                return
            }

            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handlePayment = async () => {
        if (!ride?._id || paymentDone || paymentLoading) {
            return
        }

        setPaymentLoading(true)

        try {
            const scriptLoaded = await loadRazorpayScript()
            if (!scriptLoaded) {
                throw new Error('Unable to load Razorpay checkout')
            }

            const token = localStorage.getItem('token')
            const orderResponse = await axios.post(
                `${import.meta.env.VITE_BASE_URL}/rides/create-payment-order`,
                { rideId: ride._id },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            )

            const { keyId, order } = orderResponse.data || {}
            if (!keyId || !order?.id) {
                throw new Error('Invalid payment order response')
            }

            const razorpay = new window.Razorpay({
                key: keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'MoveInSync',
                description: `Ride payment (${ride._id})`,
                order_id: order.id,
                prefill: {
                    name: userName,
                    email: user?.email || ''
                },
                theme: {
                    color: '#111111'
                },
                handler: async (response) => {
                    try {
                        await axios.post(
                            `${import.meta.env.VITE_BASE_URL}/rides/verify-payment`,
                            {
                                rideId: ride._id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            }
                        )

                        setPaymentDone(true)
                        alert('Payment successful')
                    } catch (verifyErr) {
                        const message = verifyErr?.response?.data?.message || 'Payment verification failed'
                        alert(message)
                    }
                }
            })

            razorpay.on('payment.failed', (response) => {
                const message = response?.error?.description || 'Payment failed'
                alert(message)
            })

            razorpay.open()
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Unable to start payment'
            alert(message)
        } finally {
            setPaymentLoading(false)
        }
    }

    useEffect(() => {
        if (!socket) {
            return
        }

        // Get destination coordinates
        const fetchDestinationCoords = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: destination },
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

        // Listen for captain location updates (from simulation or real-time)
        const handleLocationUpdate = (data) => {
            if (rideCompleted) {
                return
            }

            if (data?.rideId && String(data.rideId) !== String(ride?._id)) {
                return
            }

            if (data?.senderType && data.senderType !== 'captain') {
                return
            }

            if (data && data.location) {
                const lat = data.location.lat || data.location.latitude
                const lng = data.location.lng || data.location.longitude
                
                if (lat && lng) {
                    setCaptainLocation({ lat, lng })

                    // For user screen, captain's current position is the "pickup" location approaching
                    // Check if captain is getting close to delivery/current user area
                    // We'll compare captain position to user's position
                }
            }
        }

        // Track user's location
        const watchId = navigator.geolocation.watchPosition((position) => {
            const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }
            setUserLocation(userPos)

            // Check distance from user to received captain location
            if (captainLocation) {
                const distToCaptain = calculateDistance(userPos.lat, userPos.lng, captainLocation.lat, captainLocation.lng)
                if (distToCaptain < 100 && !userCloseToPickup) {
                    setUserCloseToPickup(true)
                    alert(`🎉 Captain is nearby! Distance: ${Math.round(distToCaptain)}m`)
                }
            }
        }, (error) => {
            console.log('Geolocation error:', error.message)
        })

        socket.on('ride-location-update', handleLocationUpdate)

        const handleRideEnded = (data) => {
            const payloadRideId = data?.data?._id || data?._id || data?.rideId
            if (!payloadRideId || String(payloadRideId) !== String(ride?._id)) {
                return
            }

            console.log('Ride ended event received:', data)
            
            // Store completed ride data
            if (data?.data) {
                setCompletedRideData(data.data)
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
            setRideCompleted(true)
            
            // Auto-navigate after 3 seconds
            setTimeout(() => {
                navigate('/home')
            }, 3000)
        }

        socket.on('ride-ended', handleRideEnded)

        return () => {
            socket.off('ride-location-update', handleLocationUpdate)
            socket.off('ride-ended', handleRideEnded)
            navigator.geolocation.clearWatch(watchId)
        }
    }, [ socket, navigate, userCloseToPickup, rideCompleted, ride?._id, destination ])


    return (
        <div className='h-screen bg-slate-100 p-4 md:p-6 relative overflow-hidden'>
            <div className='h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4'>
                <div className='relative rounded-2xl overflow-hidden shadow-xl bg-white h-[50vh] lg:h-full'>
                    <div className='absolute top-4 left-4 z-40 bg-white/95 rounded-xl px-4 py-2 shadow-md'>
                        <h2 className='text-lg font-bold'>MoveInSync</h2>
                        <p className='text-xs text-gray-500'>Your ride is in progress</p>
                    </div>
                    <Link to='/home' className='absolute right-4 top-4 z-40 h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md'>
                        <i className="text-lg font-medium ri-home-5-line"></i>
                    </Link>
                    {!rideCompleted && (
                        <LiveTracking
                            pickup={pickup}
                            destination={destination}
                            markersDraggable={false}
                            rideId={ride?._id}
                            actorType='user'
                            isRideCompleted={rideCompleted}
                        />
                    )}
                </div>

                <div className='rounded-2xl bg-white shadow-xl p-6 flex flex-col overflow-y-auto'>
                    <div>
                        <h4 className='text-2xl font-semibold'>Riding</h4>
                        <p className='text-sm text-gray-500 mt-1'>Track your trip and payment details</p>
                    </div>

                    <div className='mt-5 space-y-3'>
                        <div className='bg-gray-100 rounded-xl p-3 flex items-center justify-between'>
                            <div>
                                <p className='text-xs text-gray-500'>Captain</p>
                                <p className='text-lg font-semibold capitalize'>{captainName}</p>
                            </div>
                            <div className='text-right'>
                                <p className='text-xs text-gray-500'>Vehicle</p>
                                <p className='font-semibold'>{captainVehiclePlate}</p>
                                <p className='text-xs text-gray-600 capitalize'>{captainVehicleType}</p>
                            </div>
                        </div>

                        <div className='bg-gray-100 rounded-xl p-3'>
                            <p className='text-xs text-gray-500'>Pickup</p>
                            <p className='text-sm font-medium mt-1'>{pickup}</p>
                        </div>

                        <div className='bg-gray-100 rounded-xl p-3'>
                            <p className='text-xs text-gray-500'>Destination</p>
                            <p className='text-sm font-medium mt-1'>{destination}</p>
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                            <div className='bg-gray-100 rounded-xl p-3'>
                                <p className='text-xs text-gray-500'>Fare</p>
                                <p className='text-lg font-semibold mt-1'>₹{fare}</p>
                            </div>
                            <div className='bg-gray-100 rounded-xl p-3'>
                                <p className='text-xs text-gray-500'>OTP</p>
                                <p className='text-lg font-semibold mt-1 tracking-wide'>{otp}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={paymentDone || paymentLoading}
                        className={`w-full mt-6 text-white font-semibold p-3 rounded-lg ${paymentDone ? 'bg-gray-500' : 'bg-green-600'}`}
                    >
                        {paymentDone ? 'Payment Completed' : (paymentLoading ? 'Processing...' : 'Make a Payment')}
                    </button>

                    <RideCommunication
                        ride={ride}
                        senderId={user?._id}
                        senderType='user'
                        senderName={userName}
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
                            <p className='text-gray-600 mt-2'>Thank you for riding with MoveInSync</p>
                        </div>

                        <div className='bg-gray-100 rounded-xl p-4 mb-6 space-y-2'>
                            <div className='flex justify-between'>
                                <span className='text-gray-600'>Destination:</span>
                                <span className='font-semibold'>{destination}</span>
                            </div>
                            <div className='flex justify-between border-t pt-2'>
                                <span className='text-gray-600'>Fare:</span>
                                <span className='font-semibold'>₹{fare}</span>
                            </div>
                            <div className='flex justify-between border-t pt-2'>
                                <span className='text-gray-600'>Status:</span>
                                <span className='font-semibold text-green-600'>Completed</span>
                            </div>
                        </div>

                        <p className='text-sm text-gray-500 mb-4'>Redirecting to home in 3 seconds...</p>
                        
                        <button
                            onClick={() => navigate('/home')}
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

export default Riding