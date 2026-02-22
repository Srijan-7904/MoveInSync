
import React, { useContext } from 'react'
import { CaptainDataContext } from '../context/CapatainContext'

const CaptainDetails = () => {

    const { captain } = useContext(CaptainDataContext)

    const firstName = captain?.fullname?.firstname || ''
    const lastName = captain?.fullname?.lastname || ''
    const captainName = `${firstName} ${lastName}`.trim() || 'Captain'

    const earnings = Number(
        captain?.earnings
        ?? captain?.totalEarnings
        ?? captain?.stats?.earnings
        ?? 0
    )

    const totalWorkingHours = Number(
        captain?.totalWorkingHours
        ?? captain?.workingHours
        ?? captain?.stats?.totalWorkingHours
        ?? 0
    )

    const completedTrips = Number(
        captain?.completedTrips
        ?? captain?.totalTrips
        ?? captain?.stats?.completedTrips
        ?? 0
    )

    const avgRating = Number(
        captain?.rating
        ?? captain?.avgRating
        ?? captain?.stats?.rating
        ?? 0
    )

    const captainStatus = captain?.status || 'inactive'
    const vehicleType = captain?.vehicle?.vehicleType || 'Not set'
    const vehiclePlate = captain?.vehicle?.plate || 'Not set'
    const vehicleColor = captain?.vehicle?.color || 'Not set'
    const email = captain?.email || 'Not available'
    const latitude = captain?.location?.ltd
    const longitude = captain?.location?.lng
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
    const locationLabel = hasLocation
        ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        : 'Location unavailable'

    return (
        <div className='space-y-4'>
            <div className='flex items-start justify-between gap-3'>
                <div className='flex items-center justify-start gap-3 min-w-0'>
                    <img className='h-11 w-11 rounded-full object-cover border border-gray-200' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdlMd7stpWUCmjpfRjUsQ72xSWikidbgaI1w&s" alt="Captain" />
                    <div className='min-w-0'>
                        <h4 className='text-lg font-semibold capitalize truncate'>{captainName}</h4>
                        <p className='text-xs text-gray-500 truncate'>{email}</p>
                    </div>
                </div>
                <div className='text-right'>
                    <h4 className='text-xl font-semibold'>₹{earnings.toFixed(2)}</h4>
                    <p className='text-sm text-gray-600'>Earned</p>
                </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
                <div className='bg-gray-100 rounded-xl p-3'>
                    <p className='text-xs text-gray-500'>Total Working Hrs</p>
                    <h5 className='text-xl font-semibold mt-1'>{totalWorkingHours}</h5>
                </div>
                <div className='bg-gray-100 rounded-xl p-3'>
                    <p className='text-xs text-gray-500'>Completed Trips</p>
                    <h5 className='text-xl font-semibold mt-1'>{completedTrips}</h5>
                </div>
                <div className='bg-gray-100 rounded-xl p-3'>
                    <p className='text-xs text-gray-500'>Rating</p>
                    <h5 className='text-xl font-semibold mt-1'>{avgRating.toFixed(1)}</h5>
                </div>
                <div className='bg-gray-100 rounded-xl p-3'>
                    <p className='text-xs text-gray-500'>Status</p>
                    <h5 className='text-xl font-semibold mt-1 capitalize'>{captainStatus}</h5>
                </div>
            </div>

            <div className='bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-500'>Vehicle</span>
                    <span className='font-medium capitalize'>{vehicleType}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-500'>Plate</span>
                    <span className='font-medium'>{vehiclePlate}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-500'>Color</span>
                    <span className='font-medium capitalize'>{vehicleColor}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                    <span className='text-gray-500'>Current Location</span>
                    <span className='font-medium text-right'>{locationLabel}</span>
                </div>
            </div>
        </div>
    )
}

export default CaptainDetails