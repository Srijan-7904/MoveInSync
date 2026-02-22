import React, { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { useContext } from 'react';
import { UserDataContext } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import VoiceAssistant from '../components/VoiceAssistant';
import AiVoiceButton from '../components/AiVoiceButton';

const Home = () => {
    const [ pickup, setPickup ] = useState('')
    const [ destination, setDestination ] = useState('')
    const [ pickupLoading, setPickupLoading ] = useState(false)
    const [ panelOpen, setPanelOpen ] = useState(false)
    const vehiclePanelRef = useRef(null)
    const confirmRidePanelRef = useRef(null)
    const vehicleFoundRef = useRef(null)
    const waitingForDriverRef = useRef(null)
    const [ vehiclePanel, setVehiclePanel ] = useState(false)
    const [ confirmRidePanel, setConfirmRidePanel ] = useState(false)
    const [ vehicleFound, setVehicleFound ] = useState(false)
    const [ waitingForDriver, setWaitingForDriver ] = useState(false)
    const [ pickupSuggestions, setPickupSuggestions ] = useState([])
    const [ destinationSuggestions, setDestinationSuggestions ] = useState([])
    const [ activeField, setActiveField ] = useState(null)
    const [ fare, setFare ] = useState({})
    const [ vehicleType, setVehicleType ] = useState(null)
    const [ ride, setRide ] = useState(null)

    const navigate = useNavigate()

    const { socket } = useContext(SocketContext)
    const { user } = useContext(UserDataContext)

    useEffect(() => {
        socket.emit("join", { userType: "user", userId: user._id })
    }, [ user ])

    socket.on('ride-confirmed', ride => {


        setVehicleFound(false)
        setWaitingForDriver(true)
        setRide(ride)
    })

    socket.on('ride-started', ride => {
        console.log("ride")
        setWaitingForDriver(false)
        navigate('/riding', { state: { ride } }) // Updated navigate to include ride data
    })


    const handlePickupChange = (e) => {
        const value = e.target.value
        setPickup(value)
        setPanelOpen(true)
        setActiveField('pickup')

        if (!value || value.trim().length < 3) {
            setPickupSuggestions([])
            return
        }
    }

    const handleDestinationChange = (e) => {
        const value = e.target.value
        setDestination(value)
        setPanelOpen(true)
        setActiveField('destination')

        if (!value || value.trim().length < 3) {
            setDestinationSuggestions([])
            return
        }
    }

    useEffect(() => {
        if (!pickup || pickup.trim().length < 3) {
            setPickupSuggestions([])
            return
        }

        let isCancelled = false
        const timeoutId = setTimeout(async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                    params: { input: pickup.trim() },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                })

                if (!isCancelled) {
                    setPickupSuggestions(Array.isArray(response.data) ? response.data : [])
                }
            } catch {
                if (!isCancelled) {
                    setPickupSuggestions([])
                }
            }
        }, 500)

        return () => {
            isCancelled = true
            clearTimeout(timeoutId)
        }
    }, [ pickup ])

    useEffect(() => {
        if (!destination || destination.trim().length < 3) {
            setDestinationSuggestions([])
            return
        }

        let isCancelled = false
        const timeoutId = setTimeout(async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                    params: { input: destination.trim() },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                })

                if (!isCancelled) {
                    setDestinationSuggestions(Array.isArray(response.data) ? response.data : [])
                }
            } catch {
                if (!isCancelled) {
                    setDestinationSuggestions([])
                }
            }
        }, 500)

        return () => {
            isCancelled = true
            clearTimeout(timeoutId)
        }
    }, [ destination ])

    const submitHandler = (e) => {
        e.preventDefault()
    }

    const setCurrentLocationAsPickup = () => {
        if (!navigator.geolocation) {
            return;
        }

        setPickupLoading(true);

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;

                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/reverse-geocode`, {
                    params: {
                        lat: latitude,
                        lng: longitude
                    },
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const address = response.data?.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                setPickup(address);
                setActiveField('pickup');
                setPickupSuggestions([]);
            } catch {
                setPickup(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
            } finally {
                setPickupLoading(false);
            }
        }, () => {
            setPickupLoading(false);
        });
    }

    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehiclePanel ])

    useGSAP(function () {
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePanel ])

    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehicleFound ])

    useGSAP(function () {
        if (waitingForDriver) {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ waitingForDriver ])


    async function findTrip() {
        setVehiclePanel(true)
        setPanelOpen(false)

        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
            params: { pickup, destination },
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })


        setFare(response.data)


    }

    async function createRide() {
        const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
            pickup,
            destination,
            vehicleType
        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })


    }

    // Smart confirm handler for voice commands
    const handleVoiceConfirm = () => {
        console.log('Voice confirm - confirmRidePanel:', confirmRidePanel, 'vehicleType:', vehicleType, 'vehiclePanel:', vehiclePanel)
        
        if (confirmRidePanel && vehicleType) {
            // If on confirm ride panel, create the ride (matching ConfirmRide button order)
            console.log('Creating ride...')
            setVehicleFound(true)
            setConfirmRidePanel(false)
            createRide()
        } else if (vehiclePanel && vehicleType) {
            // If vehicle is selected, move to confirm panel
            console.log('Moving to confirm panel...')
            setVehiclePanel(false)
            setConfirmRidePanel(true)
        } else if (pickup && destination) {
            // If pickup and destination are filled, find trip
            console.log('Finding trip...')
            findTrip()
        }
    }

    // Handle vehicle selection from voice
    const handleVoiceVehicleSelect = (type) => {
        console.log('Voice selected vehicle:', type)
        setVehicleType(type)
        // Automatically move to confirm panel after vehicle selection
        setTimeout(() => {
            setVehiclePanel(false)
            setConfirmRidePanel(true)
        }, 500)
    }

    return (
        <div className='h-screen bg-slate-100 p-4 md:p-6 relative overflow-hidden'>
            {/* Voice Assistant Integration */}
            <VoiceAssistant
                onPickupFill={(value) => setPickup(value)}
                onDestinationFill={(value) => setDestination(value)}
                onVehicleSelect={handleVoiceVehicleSelect}
                onConfirmAction={handleVoiceConfirm}
            />
            <AiVoiceButton />

            <div className='h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4'>
                <div className='relative rounded-2xl overflow-hidden shadow-xl bg-white h-[50vh] lg:h-full'>
                    <div className='absolute top-4 left-4 z-40 bg-white/95 rounded-xl px-4 py-2 shadow-md'>
                        <h2 className='text-lg font-bold'>MoveInSync</h2>
                        <p className='text-xs text-gray-500'>Live ride tracking</p>
                    </div>
                    <Link to='/user/logout' className='absolute top-4 right-4 z-[1000] h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md'>
                        <i className="text-lg font-medium ri-logout-box-r-line"></i>
                    </Link>
                    <LiveTracking
                        pickup={pickup}
                        destination={destination}
                        onPickupChange={setPickup}
                        onDestinationChange={setDestination}
                    />
                </div>

                <div className='rounded-2xl bg-white shadow-xl p-6 flex flex-col overflow-hidden'>
                    <div className='relative'>
                        <h4 className='text-2xl font-semibold'>Find a trip</h4>
                        <p className='text-sm text-gray-500 mt-1'>Choose pickup and destination for instant fare</p>
                        <form className='relative py-3' onSubmit={(e) => {
                            submitHandler(e)
                        }}>
                            <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-gray-400 rounded-full"></div>
                            <div className='relative'>
                                <input
                                    onFocus={() => {
                                        setPanelOpen(true)
                                        setActiveField('pickup')
                                    }}
                                    value={pickup}
                                    onChange={handlePickupChange}
                                    className='bg-[#f2f4f7] px-12 py-3 text-base rounded-xl w-full border border-gray-200'
                                    type="text"
                                    placeholder='Add a pick-up location'
                                />
                                <button
                                    type='button'
                                    onClick={setCurrentLocationAsPickup}
                                    disabled={pickupLoading}
                                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-600 transition-colors'
                                >
                                    {pickupLoading ? (
                                        <i className="ri-loader-4-line animate-spin text-lg"></i>
                                    ) : (
                                        <i className="ri-gps-line text-lg"></i>
                                    )}
                                </button>
                            </div>
                            <input
                                onFocus={() => {
                                    setPanelOpen(true)
                                    setActiveField('destination')
                                }}
                                value={destination}
                                onChange={handleDestinationChange}
                                className='bg-[#f2f4f7] px-12 py-3 text-base rounded-xl w-full mt-3 border border-gray-200'
                                type="text"
                                placeholder='Enter your destination' />
                        </form>
                        <button
                            onClick={findTrip}
                            className='bg-black text-white px-4 py-3 rounded-xl mt-2 w-full font-medium'>
                            Find Trip
                        </button>
                    </div>
                    <div className={`bg-white overflow-hidden mt-4 border-t border-gray-100 transition-all duration-300 ${panelOpen ? 'max-h-[320px] opacity-100 pt-2' : 'max-h-0 opacity-0 pt-0'}`}>
                        <LocationSearchPanel
                            suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                            setPanelOpen={setPanelOpen}
                            setVehiclePanel={setVehiclePanel}
                            setPickup={setPickup}
                            setDestination={setDestination}
                            activeField={activeField}
                        />
                    </div>
                </div>
            </div>
            <div ref={vehiclePanelRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-10 pt-12 relative'>
                    <VehiclePanel
                        selectVehicle={setVehicleType}
                        fare={fare} setConfirmRidePanel={setConfirmRidePanel} setVehiclePanel={setVehiclePanel} />
                </div>
            </div>
            <div ref={confirmRidePanelRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-6 pt-12 relative'>
                    <ConfirmRide
                        createRide={createRide}
                        pickup={pickup}
                        destination={destination}
                        fare={fare}
                        vehicleType={vehicleType}

                        setConfirmRidePanel={setConfirmRidePanel} setVehicleFound={setVehicleFound} />
                </div>
            </div>
            <div ref={vehicleFoundRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-6 pt-12 relative'>
                    <LookingForDriver
                        createRide={createRide}
                        pickup={pickup}
                        destination={destination}
                        fare={fare}
                        vehicleType={vehicleType}
                        setVehicleFound={setVehicleFound} />
                </div>
            </div>
            <div ref={waitingForDriverRef} className='fixed inset-x-0 z-50 bottom-0 px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-6 pt-12 relative'>
                    <WaitingForDriver
                        ride={ride}
                        setVehicleFound={setVehicleFound}
                        setWaitingForDriver={setWaitingForDriver}
                        waitingForDriver={waitingForDriver} />
                </div>
            </div>
        </div>
    )
}

export default Home