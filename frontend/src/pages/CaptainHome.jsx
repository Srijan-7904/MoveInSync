import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CapatainContext'
import axios from 'axios'
import LiveTracking from '../components/LiveTracking'
import AiVoiceButton from '../components/AiVoiceButton'

const CaptainHome = () => {

    const [ ridePopupPanel, setRidePopupPanel ] = useState(false)
    const [ confirmRidePopupPanel, setConfirmRidePopupPanel ] = useState(false)

    const ridePopupPanelRef = useRef(null)
    const confirmRidePopupPanelRef = useRef(null)
    const [ ride, setRide ] = useState(null)

    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)

    useEffect(() => {
        if (!socket || !captain?._id) {
            return
        }

        socket.emit('join', {
            userId: captain._id,
            userType: 'captain'
        })

        const updateLocation = () => {
            if (!navigator.geolocation) {
                return
            }

            navigator.geolocation.getCurrentPosition((position) => {
                socket.emit('update-location-captain', {
                    userId: captain._id,
                    location: {
                        ltd: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                })
            })
        }

        const locationInterval = setInterval(updateLocation, 10000)
        updateLocation()

        return () => clearInterval(locationInterval)
    }, [ socket, captain?._id ])

    useEffect(() => {
        if (!socket) {
            return
        }

        const handleNewRide = (data) => {
            setRide(data)
            setRidePopupPanel(true)
        }

        socket.on('new-ride', handleNewRide)

        return () => {
            socket.off('new-ride', handleNewRide)
        }
    }, [ socket ])

    async function confirmRide() {
        if (!ride?._id) {
            return
        }

        const captainToken = localStorage.getItem('captain-token') || localStorage.getItem('token')

        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {
                rideId: ride._id
            }, {
                headers: {
                    Authorization: `Bearer ${captainToken}`
                }
            })

            if (response.status === 200) {
                setRide(response.data)
                setRidePopupPanel(false)
                setConfirmRidePopupPanel(true)
            }
        } catch (error) {
            const message = error?.response?.data?.message || 'Unable to confirm ride. Please login as captain and try again.'
            alert(message)
        }

    }


    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ ridePopupPanel ])

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePopupPanel ])

    return (
        <div className='h-screen bg-slate-100 p-4 md:p-6 relative overflow-hidden'>
            <AiVoiceButton />
            
            <div className='h-full grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4'>
                <div className='relative rounded-2xl overflow-hidden shadow-xl bg-white h-[50vh] lg:h-full'>
                    <div className='absolute top-4 left-4 z-40 bg-white/95 rounded-xl px-4 py-2 shadow-md'>
                        <h2 className='text-lg font-bold'>MoveInSync</h2>
                        <p className='text-xs text-gray-500'>Captain dashboard</p>
                    </div>
                    <Link to='/captain/logout' className='absolute top-4 right-4 z-[1000] h-10 w-10 bg-white flex items-center justify-center rounded-full shadow-md'>
                        <i className="text-lg font-medium ri-logout-box-r-line"></i>
                    </Link>
                    <LiveTracking />
                </div>

                <div className='rounded-2xl bg-white shadow-xl p-6 flex flex-col justify-between'>
                    <div>
                        <h4 className='text-2xl font-semibold'>Captain Home</h4>
                        <p className='text-sm text-gray-500 mt-1'>Stay online and accept nearby ride requests</p>
                    </div>
                    <div className='mt-6'>
                        <CaptainDetails />
                    </div>
                </div>
            </div>

            <div ref={ridePopupPanelRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-10 pt-12 relative'>
                    <RidePopUp
                        ride={ride}
                        setRidePopupPanel={setRidePopupPanel}
                        setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                        confirmRide={confirmRide}
                    />
                </div>
            </div>

            <div ref={confirmRidePopupPanelRef} className='fixed inset-x-0 z-50 bottom-0 translate-y-full px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0 lg:w-[calc((100vw-4rem)/2.6)]'>
                <div className='w-full bg-white rounded-2xl shadow-2xl px-4 py-6 pt-12 relative'>
                    <ConfirmRidePopUp
                        ride={ride}
                        setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                        setRidePopupPanel={setRidePopupPanel}
                    />
                </div>
            </div>
        </div>
    )
}

export default CaptainHome