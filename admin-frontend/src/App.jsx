import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const API_BASE = import.meta.env.VITE_BASE_URL || 'http://localhost:4000';

const resolveDisplayName = (person, fallback = 'N/A') => {
  if (!person) return fallback;

  const fullNameFromFullname = typeof person.fullname === 'string'
    ? person.fullname
    : `${person.fullname?.firstname || person.fullname?.firstName || ''} ${person.fullname?.lastname || person.fullname?.lastName || ''}`.trim();

  const fullNameFromFullName = typeof person.fullName === 'string'
    ? person.fullName
    : `${person.fullName?.firstname || person.fullName?.firstName || ''} ${person.fullName?.lastname || person.fullName?.lastName || ''}`.trim();

  const rootName = `${person.firstname || person.firstName || ''} ${person.lastname || person.lastName || ''}`.trim();

  return fullNameFromFullname || fullNameFromFullName || rootName || person.name || person.email || fallback;
};

export default function App() {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin123');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [passengersLoading, setPassengersLoading] = useState(false);
  const [driversLoading, setDriversLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [previousRides, setPreviousRides] = useState({});

  const authHeader = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/admin/login`, { email, password });
      const receivedToken = response.data?.token;

      if (!receivedToken) {
        throw new Error('Token not received');
      }

      setToken(receivedToken);
      localStorage.setItem('adminToken', receivedToken);
    } catch {
      setError('Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE}/admin/dashboard`, authHeader);
      setDashboard(response.data);

      // Check for ride status changes
      if (response.data?.liveRides) {
        response.data.liveRides.forEach(ride => {
          const rideId = ride._id;
          const prevStatus = previousRides[rideId];
          const currentStatus = ride.status;

          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === 'ongoing') {
              const passengerName = ride.user?.fullname?.firstname || 'Passenger';
              const driverName = ride.captain?.fullname?.firstname || 'Driver';
              addNotification(`🚗 Ride Started - ${driverName} picked up ${passengerName}`, 'success');
            } else if (currentStatus === 'completed') {
              const passengerName = ride.user?.fullname?.firstname || 'Passenger';
              const driverName = ride.captain?.fullname?.firstname || 'Driver';
              addNotification(`✅ Ride Completed - ${driverName} dropped off ${passengerName}`, 'success');
            } else if (currentStatus === 'cancelled') {
              addNotification(`❌ Ride Cancelled`, 'warning');
            }
          }

          setPreviousRides(prev => ({...prev, [rideId]: currentStatus}));
        });
      }

      if (response.data?.recentRides) {
        response.data.recentRides.forEach(ride => {
          const rideId = ride._id;
          const prevStatus = previousRides[rideId];
          const currentStatus = ride.status;

          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === 'completed') {
              const passengerName = ride.user?.fullname?.firstname || 'Passenger';
              addNotification(`✅ Ride Completed - ${passengerName}`, 'success');
            }
          }

          setPreviousRides(prev => ({...prev, [rideId]: currentStatus}));
        });
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPassengers = async () => {
    if (!token) return;
    setPassengersLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/users`, authHeader);
      setPassengers(response.data || []);
    } catch (err) {
      console.error('Failed to load passengers:', err);
    } finally {
      setPassengersLoading(false);
    }
  };

  const loadDrivers = async () => {
    if (!token) return;
    setDriversLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/admin/captains`, authHeader);
      setDrivers(response.data || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setDriversLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
      loadPassengers();
      loadDrivers();
      const interval = setInterval(() => {
        loadDashboard();
        loadPassengers();
        loadDrivers();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    setDashboard(null);
    setCurrentPage('dashboard');
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>MoveInSync</h1>
          <p>Admin Control Hub</p>
          <form onSubmit={login}>
            <div className="form-group">
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Email"
                type="email"
              />
            </div>
            <div className="form-group">
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password"
                placeholder="Password"
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? '🔄 Signing in...' : '✓ Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-wrapper">
      <NotificationContainer notifications={notifications} />
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} onLogout={logout} />
      
      <div className="admin-main">
        <header className="admin-header">
          <h1>MoveInSync</h1>
          <div className="header-actions">
            <button onClick={loadDashboard} disabled={loading} className="btn-icon">
              {loading ? '⏳' : '🔄'}
            </button>
            <button onClick={logout} className="btn-icon">🚪</button>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {dashboard && <CurrentRideBanner dashboard={dashboard} />}

        <div className="page-content">
          {!dashboard ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {currentPage === 'dashboard' && <DashboardPage dashboard={dashboard} />}
              {currentPage === 'live-map' && <LiveMapPage dashboard={dashboard} setSelectedRide={setSelectedRide} selectedRide={selectedRide} />}
              {currentPage === 'rides' && <RidesPage dashboard={dashboard} />}
              {currentPage === 'passengers' && <PassengersPage dashboard={dashboard} passengers={passengers} loading={passengersLoading} />}
              {currentPage === 'drivers' && <DriversPage dashboard={dashboard} drivers={drivers} loading={driversLoading} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentRideBanner({ dashboard }) {
  const ongoingRides = (dashboard?.liveRides || []).filter((ride) => ride?.status === 'ongoing');
  const acceptedRides = (dashboard?.liveRides || []).filter((ride) => ride?.status === 'accepted');
  const currentRide = ongoingRides[0] || acceptedRides[0] || null;

  if (!currentRide) {
    return (
      <div className="error-banner" style={{ background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }}>
        No ride is currently active.
      </div>
    );
  }

  const passenger = resolveDisplayName(currentRide.user, 'N/A');
  const captain = currentRide.captain?.fullname?.firstname || 'Unassigned';

  return (
    <div className="error-banner" style={{ background: '#ecfdf3', color: '#166534', borderColor: '#bbf7d0' }}>
      Current Ride: {currentRide.status.toUpperCase()} | Passenger: {passenger} | Captain: {captain} | Fare: ₹{currentRide.fare}
    </div>
  );
}

function Sidebar({ currentPage, setCurrentPage, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'live-map', label: 'Live Map', icon: '🗺️' },
    { id: 'rides', label: 'Rides', icon: '🚗' },
    { id: 'passengers', label: 'Passengers', icon: '👥' },
    { id: 'drivers', label: 'Drivers', icon: '🚕' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>MoveInSync</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="logout-btn" onClick={onLogout}>🚪 Logout</button>
    </aside>
  );
}

function DashboardPage({ dashboard }) {
  const ongoingRides = (dashboard?.liveRides || []).filter((ride) => ride?.status === 'ongoing');
  const acceptedRides = (dashboard?.liveRides || []).filter((ride) => ride?.status === 'accepted');
  const currentRideList = ongoingRides.length > 0 ? ongoingRides : acceptedRides;

  return (
    <div className="page">
      <h1>Dashboard Overview</h1>
      
      <div className="stats-grid">
        <StatBox icon="👥" label="Total Users" value={dashboard.summary?.totalUsers || 0} />
        <StatBox icon="🚕" label="Total Drivers" value={dashboard.summary?.totalCaptains || 0} />
        <StatBox icon="🟢" label="Active Drivers" value={dashboard.summary?.activeCaptains || 0} />
        <StatBox icon="⚡" label="Live Rides" value={(dashboard.liveRides || []).length} />
        <StatBox icon="🚗" label="Total Rides" value={dashboard.summary?.totalRides || 0} />
        <StatBox icon="💰" label="Today Revenue" value={`₹${(dashboard.liveRides || []).reduce((sum, r) => sum + (r.fare || 0), 0)}`} />
      </div>

      <div className="stats-section">
        <h2>Current Ride Happening Now</h2>
        {currentRideList.length === 0 ? (
          <div className="empty-message">No current ride is happening right now.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Passenger</th>
                  <th>Captain</th>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Fare</th>
                </tr>
              </thead>
              <tbody>
                {currentRideList.map((ride) => (
                  <tr key={`current-${ride._id}`}>
                    <td><span className={`badge ${ride.status}`}>{ride.status}</span></td>
                    <td>{resolveDisplayName(ride.user, 'N/A')}</td>
                    <td>{ride.captain?.fullname?.firstname || 'Unassigned'}</td>
                    <td className="truncate">{ride.pickup?.substring(0, 30)}</td>
                    <td className="truncate">{ride.destination?.substring(0, 30)}</td>
                    <td><strong>₹{ride.fare}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h2>Ride Status Breakdown</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-icon pending">⏳</span>
            <div className="status-info">
              <div className="status-count">{dashboard.rideStatus?.pending || 0}</div>
              <div className="status-label">Pending</div>
            </div>
          </div>
          <div className="status-item">
            <span className="status-icon accepted">✓</span>
            <div className="status-info">
              <div className="status-count">{dashboard.rideStatus?.accepted || 0}</div>
              <div className="status-label">Accepted</div>
            </div>
          </div>
          <div className="status-item">
            <span className="status-icon ongoing">▶</span>
            <div className="status-info">
              <div className="status-count">{dashboard.rideStatus?.ongoing || 0}</div>
              <div className="status-label">Ongoing</div>
            </div>
          </div>
          <div className="status-item">
            <span className="status-icon completed">✔</span>
            <div className="status-info">
              <div className="status-count">{dashboard.rideStatus?.completed || 0}</div>
              <div className="status-label">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveMapPage({ dashboard, setSelectedRide, selectedRide }) {
  const geocodeCacheRef = useRef({});
  const [routeCoordsByRide, setRouteCoordsByRide] = useState({});

  const ongoingRides = useMemo(
    () => (dashboard.liveRides || []).filter((ride) => ride?.status === 'ongoing'),
    [dashboard.liveRides]
  );

  const pickupIcon = useMemo(() => L.divIcon({
    className: 'leaflet-pin pickup',
    html: '<span class="pin-shape"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  }), []);

  const destinationIcon = useMemo(() => L.divIcon({
    className: 'leaflet-pin destination',
    html: '<span class="pin-shape"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  }), []);

  const captainIcon = useMemo(() => L.divIcon({
    className: 'leaflet-pin captain',
    html: '<span class="pin-shape"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  }), []);

  useEffect(() => {
    let cancelled = false;

    const getNearestResult = (results, biasPoint) => {
      if (!Array.isArray(results) || results.length === 0) return null;
      if (!biasPoint) return results[0];

      let nearest = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const result of results) {
        const lat = Number(result.lat);
        const lng = Number(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const dLat = lat - biasPoint.lat;
        const dLng = lng - biasPoint.lng;
        const dist = (dLat * dLat) + (dLng * dLng);

        if (dist < nearestDistance) {
          nearestDistance = dist;
          nearest = result;
        }
      }

      return nearest || results[0];
    };

    const geocodeAddress = async (address, biasPoint) => {
      if (!address) return null;
      const cacheKey = `${address}`;
      const cached = geocodeCacheRef.current[cacheKey];
      if (cached) return cached;

      const base = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=5';
      const q = `q=${encodeURIComponent(address)}`;

      let url = `${base}&${q}`;
      if (biasPoint?.lat && biasPoint?.lng) {
        const west = biasPoint.lng - 0.35;
        const east = biasPoint.lng + 0.35;
        const north = biasPoint.lat + 0.35;
        const south = biasPoint.lat - 0.35;
        url = `${base}&${q}&viewbox=${west},${north},${east},${south}&bounded=1`;
      }

      let response = await fetch(url);
      if (!response.ok) return null;

      let result = await response.json();

      if ((!result || result.length === 0) && biasPoint) {
        response = await fetch(`${base}&${q}`);
        if (!response.ok) return null;
        result = await response.json();
      }

      const best = getNearestResult(result, biasPoint);
      if (!best) return null;

      const coords = {
        lat: Number(best.lat),
        lng: Number(best.lon)
      };

      if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

      geocodeCacheRef.current[cacheKey] = coords;
      return coords;
    };

    const loadRouteCoords = async () => {
      const next = {};

      for (const ride of ongoingRides) {
        try {
          const captainLat = Number(ride?.captain?.location?.ltd);
          const captainLng = Number(ride?.captain?.location?.lng);
          const captainCoords = Number.isFinite(captainLat) && Number.isFinite(captainLng)
            ? { lat: captainLat, lng: captainLng }
            : null;

          const [pickupCoords, destinationCoords] = await Promise.all([
            geocodeAddress(ride.pickup, captainCoords),
            geocodeAddress(ride.destination, captainCoords)
          ]);

          if (pickupCoords && destinationCoords) {
            next[ride._id] = {
              pickupCoords,
              destinationCoords,
              captainCoords
            };
          }
        } catch {
          // skip failed geocode for this ride
        }
      }

      if (!cancelled) {
        setRouteCoordsByRide(next);
      }
    };

    loadRouteCoords();

    return () => {
      cancelled = true;
    };
  }, [ongoingRides]);

  const ongoingRidesWithRoute = ongoingRides.filter((ride) => routeCoordsByRide[ride._id]);

  const mapPoints = ongoingRidesWithRoute.flatMap((ride) => {
    const route = routeCoordsByRide[ride._id];
    if (!route) return [];

    const points = [
      [route.pickupCoords.lat, route.pickupCoords.lng],
      [route.destinationCoords.lat, route.destinationCoords.lng]
    ];

    if (route.captainCoords?.lat && route.captainCoords?.lng) {
      points.push([route.captainCoords.lat, route.captainCoords.lng]);
    }

    return points;
  });

  return (
    <div className="page live-map-page">
      <h1>Live Map & Trip Details</h1>
      
      <div className="map-container">
        <div className="map-box">
          <MapContainer
            center={[31.25, 75.65]}
            zoom={12}
            className="leaflet-map"
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            <MapBoundsUpdater points={mapPoints} />

            {ongoingRidesWithRoute.map((ride) => {
              const route = routeCoordsByRide[ride._id];
              if (!route) return null;

              return (
                <React.Fragment key={`route-${ride._id}`}>
                  <Polyline
                    positions={[
                      [route.pickupCoords.lat, route.pickupCoords.lng],
                      [route.destinationCoords.lat, route.destinationCoords.lng]
                    ]}
                    pathOptions={{ color: '#111827', weight: selectedRide?._id === ride._id ? 7 : 5, opacity: 0.9 }}
                    eventHandlers={{ click: () => setSelectedRide(ride) }}
                  />

                  <Marker
                    position={[route.pickupCoords.lat, route.pickupCoords.lng]}
                    icon={pickupIcon}
                    eventHandlers={{ click: () => setSelectedRide(ride) }}
                  />

                  <Marker
                    position={[route.destinationCoords.lat, route.destinationCoords.lng]}
                    icon={destinationIcon}
                    eventHandlers={{ click: () => setSelectedRide(ride) }}
                  />

                  {route.captainCoords?.lat && route.captainCoords?.lng && (
                    <Marker
                      position={[route.captainCoords.lat, route.captainCoords.lng]}
                      icon={captainIcon}
                      eventHandlers={{ click: () => setSelectedRide(ride) }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>

          <div className="gps-legend">
            <span><i className="legend-dot green"></i> Pickup</span>
            <span><i className="legend-dot red"></i> Destination</span>
            <span><i className="legend-dot captain"></i> Captain GPS</span>
          </div>
        </div>

        <div className="trips-panel">
          <h2>Ongoing Trips ({ongoingRides.length})</h2>
          
          {ongoingRides.length === 0 ? (
            <div className="empty-message">No ongoing trips</div>
          ) : ongoingRidesWithRoute.length === 0 ? (
            <div className="empty-message">Loading route coordinates for ongoing trips...</div>
          ) : (
            <div className="trips-list">
              {ongoingRides.map((ride) => (
                <div
                  key={ride._id}
                  className={`trip-item ${selectedRide?._id === ride._id ? 'selected' : ''}`}
                  onClick={() => setSelectedRide(ride)}
                >
                  <div className="trip-header-mini">
                    <span className={`badge ${ride.status}`}>{ride.status}</span>
                    <span className="fare">₹{ride.fare}</span>
                  </div>
                  <div className="trip-info-mini">
                    <div className="driver-name">{ride.captain?.fullname?.firstname || 'Unassigned'}</div>
                    <div className="passenger-name">{ride.user?.fullname?.firstname || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRide && (
        <div className="trip-detail-card">
          <h2>Trip Details</h2>
          <div className="detail-grid">
            <DetailItem label="Driver" value={selectedRide.captain?.fullname?.firstname || 'Unassigned'} icon="🚕" />
            <DetailItem label="Passenger" value={selectedRide.user?.fullname?.firstname || 'N/A'} icon="👤" />
            <DetailItem label="Status" value={selectedRide.status.toUpperCase()} icon="📍" />
            <DetailItem label="Fare" value={`₹${selectedRide.fare}`} icon="💰" />
            <DetailItem label="Pickup" value={selectedRide.pickup?.substring(0, 40)} icon="📍" />
            <DetailItem label="Destination" value={selectedRide.destination?.substring(0, 40)} icon="🎯" />
          </div>
        </div>
      )}
    </div>
  );
}

function MapBoundsUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, points]);

  return null;
}

function RidesPage({ dashboard }) {
  const allRides = [...(dashboard.liveRides || []), ...(dashboard.recentRides || [])];

  return (
    <div className="page">
      <h1>All Rides ({allRides.length})</h1>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Passenger</th>
              <th>Driver</th>
              <th>Pickup</th>
              <th>Destination</th>
              <th>Fare</th>
            </tr>
          </thead>
          <tbody>
            {allRides.map((ride) => (
              <tr key={ride._id}>
                <td><span className={`badge ${ride.status}`}>{ride.status}</span></td>
                <td>{resolveDisplayName(ride.user, 'N/A')}</td>
                <td>{ride.captain?.fullname?.firstname || 'Unassigned'}</td>
                <td className="truncate">{ride.pickup?.substring(0, 30)}</td>
                <td className="truncate">{ride.destination?.substring(0, 30)}</td>
                <td><strong>₹{ride.fare}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PassengersPage({ dashboard, passengers, loading }) {
  return (
    <div className="page">
      <h1>Passengers ({dashboard?.summary?.totalUsers || passengers.length})</h1>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading passengers...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {passengers.length > 0 ? passengers.map((passenger) => {
                const fullName = (
                  typeof passenger.fullname === 'string'
                    ? passenger.fullname
                    : `${passenger.fullname?.firstname || passenger.fullname?.firstName || ''} ${passenger.fullname?.lastname || passenger.fullname?.lastName || ''}`.trim()
                ) || (
                  typeof passenger.fullName === 'string'
                    ? passenger.fullName
                    : `${passenger.fullName?.firstname || passenger.fullName?.firstName || ''} ${passenger.fullName?.lastname || passenger.fullName?.lastName || ''}`.trim()
                ) || `${passenger.firstname || passenger.firstName || ''} ${passenger.lastname || passenger.lastName || ''}`.trim();
                return (
                <tr key={passenger._id}>
                  <td>{fullName || passenger.name || passenger.email || 'N/A'}</td>
                  <td className="truncate">{passenger.email || 'N/A'}</td>
                  <td>{passenger.phone || 'N/A'}</td>
                  <td><span className="badge active">Active</span></td>
                </tr>
              )}) : (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', color: '#94a3b8'}}>No passengers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DriversPage({ dashboard, drivers, loading }) {
  return (
    <div className="page">
      <h1>Drivers ({dashboard?.summary?.totalCaptains || drivers.length})</h1>
      
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading drivers...</p>
        </div>
      ) : (
        <div className="drivers-grid">
          {drivers.length > 0 ? drivers.map((driver) => {
            const fullName = typeof driver.fullname === 'string' 
              ? driver.fullname 
              : `${driver.fullname?.firstname || ''} ${driver.fullname?.lastname || ''}`.trim();
            const firstLetter = fullName ? fullName.charAt(0).toUpperCase() : 'D';
            return (
            <div key={driver._id} className="driver-card">
              <div className="driver-avatar">{firstLetter}</div>
              <h3>{fullName || driver.name || 'Unknown Driver'}</h3>
              <div className="driver-stat">📧 {driver.email || 'N/A'}</div>
              <div className="driver-stat">📱 {driver.phone || 'N/A'}</div>
              <div className="driver-stat">📍 {driver.status || 'Offline'}</div>
              <span className={`badge ${driver.status === 'active' ? 'online' : 'offline'}`}>
                {driver.status === 'active' ? 'Online' : 'Offline'}
              </span>
            </div>
          )}) : (
            <div className="empty-message">No drivers found</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="stat-box">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="detail-item">
      <div className="detail-icon">{icon}</div>
      <div className="detail-content">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{value}</div>
      </div>
    </div>
  );
}

function NotificationContainer({ notifications }) {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div key={notification.id} className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            {notification.message}
          </div>
        </div>
      ))}
    </div>
  );
}

