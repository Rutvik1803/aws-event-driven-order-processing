# Event-Driven Order Processing System

A production-ready serverless order processing system built with AWS services, Stripe payments, and React frontend.

## 🏗️ Architecture
- AWS Lambda (5 functions)
- SNS & SQS (Event-driven messaging)
- DynamoDB (Database)
- API Gateway (REST API)
- Stripe (Payment processing)
- React (Frontend)

## 📁 Project Structure
```
Project3-OrderProcessing/
├── lambda-functions/     # Lambda function code
├── frontend/            # React application
├── docs/               # Documentation
├── screenshots/        # Architecture & UI screenshots
└── README.md
```

## 🚀 Setup Guide
Coming soon...

## 📦 Tech Stack

### Backend
- **AWS Lambda** - Serverless compute
- **API Gateway** - REST API endpoints
- **SNS** - Pub/sub notifications
- **SQS** - Message queuing
- **DynamoDB** - NoSQL database
- **CloudWatch** - Monitoring & alarms
- **Stripe** - Payment processing

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Query** - API state management
- **Stripe.js** - Payment UI

## 🎯 Learning Objectives
- Event-driven architecture with SNS/SQS
- Lambda event source mappings
- Stripe payment integration & webhooks
- CloudWatch monitoring & alarms
- Dead Letter Queues for error handling
- Microservices decoupling patterns

## 📝 Progress Tracker

### EPIC 1: Project Setup & DynamoDB Tables
- [x] Story 1.1: Create Project Structure ✅
- [ ] Story 1.2: Create DynamoDB Tables

### EPIC 2: SNS & SQS Setup
- [ ] Story 2.1: Create SNS Topics
- [ ] Story 2.2: Create SQS Queues
- [ ] Story 2.3: Subscribe SQS to SNS

### EPIC 3: IAM Roles & Permissions
- [ ] Story 3.1: Create Lambda Execution Role

### EPIC 4: Lambda Functions
- [ ] Story 4.1: OrderReceiver Lambda
- [ ] Story 4.2: PaymentHandler Lambda
- [ ] Story 4.3: EmailProcessor Lambda
- [ ] Story 4.4: InventoryProcessor Lambda
- [ ] Story 4.5: GetOrderStatus Lambda

### EPIC 5: API Gateway Setup
- [ ] Story 5.1: Create REST API

### EPIC 6: CloudWatch Monitoring
- [ ] Story 6.1: Create CloudWatch Alarms
- [ ] Story 6.2: Create CloudWatch Dashboard

### EPIC 7: Stripe Integration
- [ ] Story 7.1: Configure Stripe Account
- [ ] Story 7.2: Test Stripe Payment Flow

### EPIC 8: Frontend Development
- [ ] Story 8.1: Initialize React Project
- [ ] Story 8.2: Create Product Catalog Component
- [ ] Story 8.3: Create Shopping Cart Component
- [ ] Story 8.4: Create Checkout Component
- [ ] Story 8.5: Create Order Tracking Component
- [ ] Story 8.6: Create Admin Dashboard
- [ ] Story 8.7: Add Routing & Navigation

### EPIC 9: Testing & Documentation
- [ ] Story 9.1: End-to-End Testing
- [ ] Story 9.2: Create Architecture Diagram
- [ ] Story 9.3: Take Screenshots
- [ ] Story 9.4: Write Documentation

### EPIC 10: Deployment & GitHub
- [ ] Story 10.1: Security Audit
- [ ] Story 10.2: Push to GitHub
- [ ] Story 10.3: Update Resume

## 💰 Cost Estimate
~$0.00/month with AWS Free Tier

## 👨‍💻 Author
Rutvik Rana

## 📅 Project Timeline
Started: November 2025
Duration: 5-6 hours
