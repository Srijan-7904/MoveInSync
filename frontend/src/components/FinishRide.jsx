import React from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'


const FinishRide = (props) => {
    const [ isEndingRide, setIsEndingRide ] = React.useState(false)
    const riderFirstName = props.ride?.user?.fullname?.firstname || 'Rider'
    const pickupAddress = props.ride?.pickup || 'Pickup not available'
    const destinationAddress = props.ride?.destination || 'Destination not available'
    const fare = Number(props.ride?.fare ?? 0)

    async function endRide() {
        if (!props.ride?._id || isEndingRide) {
            return
        }

        setIsEndingRide(true)
        const captainToken = localStorage.getItem('captain-token') || localStorage.getItem('token')

        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/end-ride`, {
                rideId: props.ride._id
            }, {
                headers: {
                    Authorization: `Bearer ${captainToken}`
                }
            })

            if (response.status === 200) {
                props.setFinishRidePanel(false)
                if (typeof props.onRideFinished === 'function') {
                    props.onRideFinished(response.data)
                }
            }
        } catch (error) {
            const serverMessage = error?.response?.data?.message
            alert(serverMessage || 'Unable to finish ride. Please try again.')
        } finally {
            setIsEndingRide(false)
        }

    }

    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
                props.setFinishRidePanel(false)
            }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>
            <h3 className='text-2xl font-semibold mb-5'>Finish this Ride</h3>
            <div className='flex items-center justify-between p-4 border-2 border-yellow-400 rounded-lg mt-4'>
                <div className='flex items-center gap-3 '>
                    <img className='h-12 rounded-full object-cover w-12' src="https://i.pinimg.com/236x/af/26/28/af26280b0ca305be47df0b799ed1b12b.jpg" alt="" />
                    <h2 className='text-lg font-medium'>{riderFirstName}</h2>
                </div>
                <h5 className='text-lg font-semibold'>₹{fare}</h5>
            </div>
            <div className='flex gap-2 justify-between flex-col items-center'>
                <div className='w-full mt-5'>
                    <div className='flex items-center gap-5 p-3 border-b-2'>
                        <i className="ri-map-pin-user-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Pickup</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{pickupAddress}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3 border-b-2'>
                        <i className="text-lg ri-map-pin-2-fill"></i>
                        <div>
                            <h3 className='text-lg font-medium'>Destination</h3>
                            <p className='text-sm -mt-1 text-gray-600'>{destinationAddress}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-5 p-3'>
                        <i className="ri-currency-line"></i>
                        <div>
                            <h3 className='text-lg font-medium'>₹{fare} </h3>
                            <p className='text-sm -mt-1 text-gray-600'>Cash</p>
                        </div>
                    </div>
                </div>

                <div className='mt-10 w-full'>

                    <button
                        onClick={endRide}
                        disabled={isEndingRide}
                        className='w-full mt-5 flex text-lg justify-center bg-green-600 text-white font-semibold p-3 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed'>
                        {isEndingRide ? 'Finishing Ride...' : 'Finish Ride'}
                    </button>


                </div>
            </div>
        </div>
    )
}

export default FinishRide