
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
## Flow Charts
![WhatsApp Image 2026-02-23 at 10 34 58 AM](https://github.com/user-attachments/assets/15aa7139-9a43-48ef-8224-192d3de2bb6f)



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

## Deployment

- **Backend:** [Admin Server](https://moveinsync-admin.onrender.com)
- **Frontend:** [User Application](https://moveinsync-frontend.onrender.com)

---

## Security & Authentication

* JWT-based authentication
* Role-based authorization (User / Captain / Admin)
* Protected API routes with middleware
* Secure payment handling

---

## Future Enhancements

* Ride scheduling
* Surge pricing engine
* In-app chat system
* Advanced admin analytics
* ML-based route optimization

---

## Application Snapshots




![img1](https://github.com/user-attachments/assets/1728ce4d-cad5-4fb4-baa9-f7d42b02470a)

![WhatsApp Image 2026-02-23 at 10 22 45 AM](https://github.com/user-attachments/assets/40003897-b652-4c8e-9e2f-d1f19534612a)

![WhatsApp Image 2026-02-23 at 10 22 45 AM (1)](https://github.com/user-attachments/assets/574f8954-63c0-42d4-a66b-791169225405)

![WhatsApp Image 2026-02-23 at 10 22 45 AM (2)](https://github.com/user-attachments/assets/3173ee9d-9191-47f6-a623-07576c7e3a96)

![WhatsApp Image 2026-02-23 at 10 27 11 AM](https://github.com/user-attachments/assets/2b896cd5-4dfa-47a3-b513-68395515de4d)









---
## Author

**Srijan Jaiswal**
B.Tech — Computer Science and Engineering

