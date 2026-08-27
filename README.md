# 🎮 BattleX

### Esports Tournament Platform

BattleX is a full-stack esports tournament application built to provide gamers with a platform to discover, register for, and participate in esports tournaments.

The application was developed over approximately **6 months** using **Flutter** for the mobile application and **Node.js** for the backend, with **Razorpay** for online payments and **Railway / Render** for backend deployment.

---

## 🚀 About BattleX

BattleX was built as a complete esports tournament platform rather than just a standalone mobile application.

The Flutter application communicates with a Node.js backend through APIs to handle application data and tournament-related operations.

The project involved working across multiple areas of software development, including mobile application development, backend development, API integration, payment processing, deployment, and debugging.

---

## ✨ Features

- 🎮 Browse and explore esports tournaments
- 🏆 Tournament registration
- 👤 User accounts and profiles
- 📋 Tournament information and details
- 💳 Online tournament payments
- 💰 Razorpay payment gateway integration
- 🌐 REST API communication
- 📱 Flutter-based mobile application
- ⚙️ Node.js backend
- ☁️ Cloud-based backend deployment

---

## 🛠️ Tech Stack

### 📱 Frontend

- **Flutter**
- **Dart**

Flutter was used to build the mobile application and user interface.

### ⚙️ Backend

- **Node.js**
- **Express.js**

Node.js was used to develop the backend APIs and application logic.

### 💳 Payment Gateway

- **Razorpay**

Razorpay was integrated to handle online tournament payments.

### ☁️ Deployment

- **Railway**
- **Render**

These platforms were used for deploying and hosting the backend services.

---

## 🏗️ Architecture

```text
              ┌──────────────────────┐
              │     BattleX App      │
              │       Flutter        │
              └──────────┬───────────┘
                         │
                         │ REST APIs
                         ▼
              ┌──────────────────────┐
              │      Node.js         │
              │       Backend        │
              └──────────┬───────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
         Tournament    Users     Payments
           System      System      System
                                    │
                                    ▼
                              ┌──────────┐
                              │ Razorpay │
                              └──────────┘
