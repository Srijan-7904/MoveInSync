import React from 'react'

const LocationSearchPanel = ({ suggestions, setVehiclePanel, setPanelOpen, setPickup, setDestination, activeField }) => {

    const handleSuggestionClick = (suggestion) => {
        if (activeField === 'pickup') {
            setPickup(suggestion)
        } else if (activeField === 'destination') {
            setDestination(suggestion)
        }
        // setVehiclePanel(true)
        // setPanelOpen(false)
    }

    return (
        <div className='pt-3'>
            {/* Display fetched suggestions */}
            {suggestions.length === 0 && (
                <div className='text-sm text-gray-500 py-4 px-2'>
                    Start typing at least 3 characters to see location suggestions.
                </div>
            )}
            {
                suggestions.map((elem, idx) => (
                    <div key={idx} onClick={() => handleSuggestionClick(elem)} className='flex gap-4 border p-3 border-gray-200 hover:border-black rounded-xl items-center my-2 justify-start cursor-pointer transition-all bg-white'>
                        <h2 className='bg-[#f1f5f9] h-9 flex items-center justify-center w-9 rounded-full text-gray-700'><i className="ri-map-pin-fill"></i></h2>
                        <h4 className='font-medium text-sm text-gray-800'>{elem}</h4>
                    </div>
                ))
            }
        </div>
    )
}

export default LocationSearchPanel