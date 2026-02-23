
# MoveInSync

### Full-Stack Ride Booking & Real-Time Tracking Platform

---

**MoveInSync** is a scalable, full-stack ride-booking platform delivering an Uber-style mobility experience.
It supports real-time ride operations, role-based workflows, secure payments, and live tracking across **User**, **Captain**, and **Admin** applications.

Built using a modern client–server architecture with real-time communication and production-ready deployment.

---

## Project Overview

| Component   | Description                                            |
| ----------- | ------------------------------------------------------ |
| User App    | Ride booking, live tracking, payments, voice assistant |
| Captain App | Ride acceptance, navigation, earnings                  |
| Admin Panel | Monitoring, management, analytics                      |
| Backend     | REST APIs, real-time sockets, authentication           |
| Deployment  | Render                                                 |

---

## Core Features

### User Application

* JWT-based authentication
* Ride booking with pickup & drop locations
* Real-time ride tracking
* Live ride lifecycle updates (Socket.IO)
* Secure online payments using Razorpay
* Push notifications via Firebase Cloud Messaging
* AI voice assistant for hands-free booking and navigation

---

### Captain (Driver) Application

* Authentication and availability management
* Real-time ride requests
* Accept / reject ride flow
* Live location sharing
* Ride lifecycle control
* Earnings and trip history

---

### Admin Dashboard

* User and captain management
* Real-time ride monitoring
* Operational analytics
* Role-based access control

---

## Real-Time Ride Lifecycle

```
User Request
     ↓
Captain Matching
     ↓
Ride Accepted
     ↓
Live Tracking
     ↓
Ride Completion
     ↓
Payment Settlement
```

---

## System Architecture

```
React (User / Captain / Admin)
            ↓
       Node.js + Express
            ↓
        MongoDB Database
            ↓
   Socket.IO (Real-Time Updates)
```

---

## Technology Stack

### Frontend

* React
* Context API / Hooks
* Web Speech API (Voice Assistant)

### Backend

* Node.js
* Express
* MongoDB
* Socket.IO
* JWT Authentication

### Integrations

* Razorpay (Payments)
* Firebase Cloud Messaging (Notifications)
* Map APIs (Routing & Distance)

### Deployment

* Render

---

## Security & Authentication

* JWT-based authentication
* Role-based authorization (User / Captain / Admin)
* Protected API routes with middleware
* Secure payment handling

---

## Deployment

The application is deployed on **Render** with:

* Environment-based configuration
* Scalable backend services
* Production-ready build setup

---

## Future Enhancements

* Ride scheduling
* Surge pricing engine
* In-app chat system
* Advanced admin analytics
* ML-based route optimization

---

## Author

**Srijan Jaiswal**
B.Tech — Computer Science and Engineering

