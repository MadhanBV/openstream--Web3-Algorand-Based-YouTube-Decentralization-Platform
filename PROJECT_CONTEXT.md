# OpenStream — Project Context & Product Specification

> **Document Purpose:** This is the single source of truth for the OpenStream project.
>
> AI coding agents, including Antigravity, should read this document before making architectural, coding, UI/UX, database, blockchain, or deployment decisions.
>
> **Project Name:** OpenStream
> **Project Type:** Semi-Decentralized Web3 Video Streaming Platform
> **Current Development Strategy:** Build incrementally, understand each technology, test each layer independently, then integrate.
>
> **IMPORTANT:** Do not attempt to build the entire application at once. Follow the development phases defined in this document.

---

# 1. PROJECT IDENTITY

## 1.1 Project Name

**OpenStream**

OpenStream is a Web3-enabled video-sharing and streaming platform inspired by traditional platforms such as YouTube, but redesigned around:

* Creator ownership
* Decentralized video storage
* Blockchain-based rewards
* User-controlled wallets
* Transparent reward settlement
* Creator-focused monetization

The platform is **semi-decentralized**, not fully decentralized.

Traditional application infrastructure such as the frontend, backend API, database, authentication/session management, and some platform logic remains centralized, while selected components such as video storage references and financial settlements use decentralized technologies.

---

# 2. PROJECT VISION

OpenStream aims to explore what a modern creator-video platform could look like when traditional Web2 architecture is combined with Web3 technologies.

The long-term vision is:

> Build a practical video platform where creators can publish content, viewers can consume content, advertisers can run campaigns, and creator rewards can be transparently settled through blockchain.

The project should prioritize:

1. Real functionality
2. Understandable architecture
3. Good UX
4. Security
5. Maintainability
6. Scalability
7. Proper separation between Web2 and Web3 responsibilities

---

# 3. PROBLEM STATEMENT

Traditional video platforms generally rely heavily on centralized infrastructure.

Creators publish content through centralized platforms, and monetization, platform policies, and payment systems are controlled by the platform.

OpenStream explores an alternative architecture where:

* Video files can be stored using decentralized storage.
* Creator wallet ownership can be verified cryptographically.
* Creator rewards can be settled through blockchain.
* Financial transactions can be independently verified on-chain.
* Platform services can still use conventional backend technologies where decentralization is unnecessary.

---

# 4. PROPOSED SOLUTION

OpenStream combines conventional full-stack technologies with Web3 infrastructure.

The platform consists of:

* Modern web frontend
* REST API backend
* Relational database
* Decentralized file storage
* Blockchain network
* Web3 wallet
* Creator reward engine
* Advertising system
* Analytics
* Creator dashboard
* Administrative controls

The core architecture is:

```text
                    OPENSTREAM
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
     FRONTEND         BACKEND          WEB3
        |                |                |
     React            FastAPI         Algorand
        |                |                |
     Browser        PostgreSQL       Pera Wallet
        |                |
        |              Pinata
        |                |
        +------------> IPFS
```

---

# 5. CORE PRINCIPLE

OpenStream must NOT put everything on the blockchain.

Blockchain is expensive and unnecessary for many application operations.

Use each technology for the problem it solves best.

### PostgreSQL

Use for:

* Users
* Video metadata
* View records
* Analytics
* Advertisement information
* Reward calculations
* Settlement records
* Platform configuration

### IPFS

Use for:

* Video files
* Potentially other large decentralized media assets

### Algorand

Use for:

* Blockchain transactions
* Creator reward settlement
* Verifiable financial transfers
* Future Web3-related functionality

### Pera Wallet

Use for:

* Wallet connection
* Wallet ownership
* Cryptographic signing
* Receiving creator rewards

### FastAPI

Use as the central application backend connecting:

* Frontend
* PostgreSQL
* IPFS/Pinata
* Algorand
* Authentication
* Business logic

---

# 6. TECHNOLOGY STACK

## Frontend

### React

Purpose:

* User interface
* Video feed
* Video player
* Upload interface
* Creator dashboard
* Wallet interface
* Advertising interface

### Vite

Purpose:

* Frontend development server
* Fast development workflow
* Production build tooling

### TypeScript

Preferred for the new OpenStream implementation.

Purpose:

* Type safety
* Better maintainability
* Safer API integration
* Better developer experience

### Tailwind CSS

Purpose:

* UI styling
* Responsive layouts
* Design system implementation

---

# 7. UI/UX DESIGN

## Google Stitch

Google Stitch is part of the development workflow for generating and exploring UI/UX concepts.

Stitch should be used before implementing major UI sections.

General workflow:

```text
Product Requirements
        ↓
UX Requirements
        ↓
Google Stitch
        ↓
UI/UX Concepts
        ↓
Design Decisions
        ↓
React Implementation
```

Do not blindly copy generated UI.

Evaluate designs based on:

* Usability
* Accessibility
* Responsiveness
* Consistency
* Product requirements
* Technical feasibility

---

# 8. BACKEND

## Python

Primary backend programming language.

## FastAPI

Primary backend framework.

Responsibilities:

* REST API
* Authentication
* Authorization
* Video APIs
* Upload handling
* Database interaction
* View tracking
* Reward calculation
* Advertisement logic
* Settlement logic
* Blockchain interaction
* IPFS interaction

Backend should follow a modular architecture.

Suggested structure:

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── videos.py
│   │       ├── views.py
│   │       ├── ads.py
│   │       ├── rewards.py
│   │       └── settlements.py
│   │
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── core/
│   └── utils/
│
├── tests/
├── requirements.txt
└── .env
```

Exact structure can evolve as implementation progresses.

---

# 9. DATABASE

## PostgreSQL

PostgreSQL is the primary application database.

It should store application metadata and state, not large video files.

Initial conceptual entities:

```text
User
Video
View
Advertisement
Reward
Settlement
```

Potential future entities:

```text
Comment
Like
Subscription
Playlist
Report
Notification
AnalyticsEvent
Campaign
Wallet
```

Do not create unnecessary tables until the corresponding functionality is required.

---

# 10. VIDEO STORAGE

Large video files should NOT be stored:

* Directly on the blockchain
* Directly inside PostgreSQL

Instead:

```text
Video File
    ↓
Pinata
    ↓
IPFS
    ↓
CID
    ↓
PostgreSQL stores CID + metadata
```

Example conceptual database record:

```text
Video
---------------------------
id
title
description
creator_id
ipfs_cid
thumbnail_cid
duration
created_at
visibility
status
```

---

# 11. IPFS

## InterPlanetary File System

IPFS provides decentralized content-addressed storage.

Important concept:

A file is identified by its content-derived identifier called a **CID**.

Conceptual flow:

```text
video.mp4
    ↓
IPFS
    ↓
CID
```

The application should store the CID rather than treating a centralized file URL as the source of truth.

---

# 12. PINATA

Pinata is used as the IPFS infrastructure/service layer.

Responsibilities may include:

* Uploading media to IPFS
* Pinning media
* Managing IPFS assets
* Providing practical access to IPFS infrastructure

Pinata is NOT the blockchain.

Pinata is NOT the database.

Pinata helps manage decentralized storage through IPFS.

---

# 13. BLOCKCHAIN

## Algorand

Algorand is the blockchain selected for OpenStream.

Initially use:

**Algorand Testnet**

Do not use mainnet during development unless explicitly required.

Blockchain should primarily be used for:

* Creator reward settlement
* Verifiable payment transactions
* Future Web3 functionality

Do not store:

* Video files
* Large analytics datasets
* Normal application metadata
* User interface state

on-chain.

---

# 14. ALGORAND CONCEPTS TO LEARN

Before implementing complex blockchain functionality, understand:

1. Blockchain
2. Distributed ledger
3. Wallet
4. Wallet address
5. Public key
6. Private key
7. Digital signature
8. Transaction
9. Transaction fee
10. Testnet
11. Mainnet
12. Algorand accounts
13. ALGO
14. Transaction confirmation
15. SDK

The development process should teach these concepts while implementing them.

---

# 15. PERA WALLET

Pera Wallet is the primary Algorand wallet integration.

Responsibilities:

* Connect user wallet
* Obtain wallet address
* Request signatures
* Allow user to approve transactions
* Receive creator rewards

Conceptual relationship:

```text
Pera Wallet
     |
     v
Wallet Address
     |
     v
OpenStream
     |
     v
Algorand
```

Important:

The wallet is not the blockchain.

Pera Wallet is a wallet interface for interacting with the Algorand ecosystem.

---

# 16. WEB3 AUTHENTICATION

OpenStream should eventually support wallet-based authentication.

Conceptual flow:

```text
User
  ↓
Connect Pera Wallet
  ↓
OpenStream obtains wallet address
  ↓
Backend generates authentication challenge
  ↓
User signs challenge using wallet
  ↓
Backend verifies signature
  ↓
Wallet ownership confirmed
  ↓
Backend creates authenticated session/JWT
```

The backend must NEVER ask the user for their private key.

Private keys must remain controlled by the wallet.

---

# 17. JWT

JWT may be used for application session management after wallet authentication.

Conceptual flow:

```text
Wallet Signature
       ↓
Backend Verification
       ↓
JWT
       ↓
Authenticated API Requests
```

JWT is not a blockchain technology.

It is an application authentication mechanism.

---

# 18. API COMMUNICATION

Frontend and backend communicate through REST APIs.

Example:

```text
React
  ↓
POST /api/v1/videos
  ↓
FastAPI
  ↓
Business Logic
  ↓
PostgreSQL / IPFS
  ↓
Response
  ↓
React
```

Axios or another suitable HTTP client may be used on the frontend.

---

# 19. CORE USER TYPES

OpenStream initially has three major user categories.

## Viewer

Can:

* Browse videos
* Search videos
* Watch videos
* Like/interact with content
* Connect wallet
* Potentially earn/reward participation in future versions

## Creator

Can:

* Upload videos
* Manage videos
* View analytics
* Track views
* View earnings
* Connect wallet
* Receive rewards
* View settlement history

## Advertiser

Can:

* Create campaigns
* Define campaign budgets
* Select campaign parameters
* Monitor campaign performance
* View advertising analytics

Future:

## Admin

Can:

* Manage users
* Moderate content
* Manage advertisements
* Monitor settlements
* Monitor platform health
* Configure platform parameters

---

# 20. CORE FEATURES

Initial product features:

### Authentication

* Wallet connection
* Wallet ownership verification
* Application session

### Video

* Upload
* Metadata
* IPFS storage
* Video playback
* Search
* Filtering
* Creator profile

### Creator

* Creator dashboard
* Video management
* Analytics
* Reward information
* Wallet
* Settlement history

### Rewards

* View tracking
* Reward calculation
* Reward balance
* Settlement
* Blockchain transaction

### Advertising

* Advertiser dashboard
* Campaign creation
* Campaign tracking
* Campaign analytics

### Administration

* Content management
* User management
* Settlement monitoring
* Platform analytics

---

# 21. VIDEO UPLOAD FLOW

Target architecture:

```text
Creator
   ↓
React Upload Page
   ↓
FastAPI
   ↓
Validate File
   ↓
Upload to Pinata
   ↓
IPFS
   ↓
Receive CID
   ↓
Store Metadata + CID
   ↓
PostgreSQL
   ↓
Return Video Information
   ↓
React
```

Important:

The database should not contain the actual video binary as the normal architecture.

---

# 22. VIDEO PLAYBACK FLOW

```text
Viewer
   ↓
Open Video Page
   ↓
React requests video metadata
   ↓
FastAPI
   ↓
PostgreSQL
   ↓
Return metadata + CID
   ↓
Frontend constructs IPFS access URL
   ↓
Video Player
   ↓
IPFS content
```

---

# 23. VIEW TRACKING

OpenStream needs valid view tracking before creator rewards can be trusted.

Basic conceptual flow:

```text
Viewer watches video
       ↓
Frontend records viewing event
       ↓
Backend receives event
       ↓
Backend validates event
       ↓
Valid view recorded
       ↓
Reward calculation
```

The exact anti-abuse strategy should be designed before production deployment.

Potential protections:

* Rate limiting
* Session validation
* Duplicate-view detection
* Suspicious activity detection
* Server-side validation
* Minimum watch duration
* Device/session heuristics

Do not assume a frontend-only view counter is trustworthy.

---

# 24. REWARD ENGINE

Creator rewards should be calculated by backend business logic.

Conceptual:

```text
Valid Views
    ↓
Reward Rules
    ↓
Creator Reward
    ↓
Reward Ledger
    ↓
Settlement
```

Do not immediately send a blockchain transaction for every view.

The system should aggregate rewards and settle them according to a defined settlement policy.

Example conceptual model:

```text
100 valid views
       ↓
Reward calculation
       ↓
Creator balance
       ↓
Settlement threshold
       ↓
Blockchain payment
```

Actual economic values must be defined separately.

---

# 25. BLOCKCHAIN SETTLEMENT

Target flow:

```text
Creator Reward Balance
          ↓
Settlement Engine
          ↓
Validate settlement
          ↓
Create Algorand transaction
          ↓
Sign transaction using secure platform mechanism
          ↓
Submit to Algorand
          ↓
Wait for confirmation
          ↓
Record transaction ID
          ↓
Update settlement status
```

The transaction ID should be stored in PostgreSQL.

Example conceptual record:

```text
Settlement
------------------------
id
creator_id
amount
wallet_address
transaction_id
network
status
created_at
confirmed_at
```

---

# 26. SECURITY REQUIREMENTS

Security is a first-class requirement.

Never:

* Store user private keys in frontend code
* Commit `.env` files
* Expose API secrets
* Hard-code Pinata secrets
* Hard-code database passwords
* Put blockchain private keys in GitHub
* Trust client-provided reward amounts
* Trust client-provided view counts

Use environment variables for secrets.

Example:

```text
DATABASE_URL=
JWT_SECRET=
PINATA_API_KEY=
PINATA_SECRET=
ALGORAND_NETWORK=
ALGORAND_NODE_URL=
ALGORAND_SENDER_ADDRESS=
ALGORAND_PRIVATE_KEY=
```

Exact variables will evolve with implementation.

---

# 27. ENVIRONMENT MANAGEMENT

Use:

```text
.env
.env.example
```

`.env` must never be committed.

`.env.example` should contain variable names but no real secrets.

Example:

```text
DATABASE_URL=
PINATA_API_KEY=
PINATA_SECRET=
JWT_SECRET=
ALGORAND_NETWORK=
```

---

# 28. FRONTEND ARCHITECTURE

Suggested structure:

```text
frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── assets/
│   └── App.tsx
│
├── public/
├── package.json
└── vite.config.ts
```

Prefer feature-based organization as the application grows.

Avoid putting all logic inside `App.tsx`.

---

# 29. BACKEND ARCHITECTURE

Prefer separation of responsibilities.

```text
API Route
    ↓
Schema Validation
    ↓
Service Layer
    ↓
Repository / Database
```

External services should have dedicated service modules.

For example:

```text
IPFS Service
Blockchain Service
Wallet/Auth Service
Reward Service
Video Service
Advertisement Service
```

Avoid putting all business logic directly inside route files.

---

# 30. DESIGN SYSTEM

OpenStream should have a consistent visual identity.

Design principles:

* Modern
* Clean
* Professional
* Creator-focused
* Web3-aware without becoming visually excessive
* Strong typography
* Clear information hierarchy
* Responsive
* Accessible

Avoid unnecessary:

* Excessive neon effects
* Random gradients
* Excessive glassmorphism
* Unreadable futuristic fonts
* Overuse of blockchain-themed graphics

The product should feel like a serious modern platform rather than a generic "crypto website."

---

# 31. RESPONSIVE DESIGN

The application should support:

* Desktop
* Laptop
* Tablet
* Mobile

The primary development environment may be desktop, but mobile responsiveness must be considered from the beginning.

---

# 32. DEVELOPMENT PHILOSOPHY

OpenStream must be developed incrementally.

Do NOT attempt to implement the entire project in one prompt.

Each phase should:

1. Define the goal
2. Understand the technology
3. Implement a small component
4. Run it
5. Test it
6. Fix problems
7. Document the result
8. Move to the next phase

---

# 33. DEVELOPMENT PHASES

## Phase 0 — Project Context

Create:

```text
PROJECT_CONTEXT.md
```

Define:

* Product
* Architecture
* Features
* Technology
* Development roadmap

Status:

**Current initial phase**

---

## Phase 1 — UX/UI Design

Use Google Stitch to design:

1. Landing page
2. Home/feed
3. Video watch page
4. Search
5. Creator profile
6. Upload page
7. Creator dashboard
8. Wallet/rewards interface

Do not implement every screen simultaneously.

Start with the core user journey.

---

## Phase 2 — Frontend Foundation

Set up:

* React
* Vite
* TypeScript
* Tailwind CSS

Implement the approved UI.

At this stage:

**No blockchain.**

---

## Phase 3 — Backend Foundation

Set up:

* Python
* FastAPI
* API structure
* Error handling
* Configuration
* CORS
* Basic health endpoint

Example:

```text
GET /health
```

---

## Phase 4 — PostgreSQL

Implement:

* Database connection
* Models
* Migrations
* User model
* Video model
* View model

Then connect frontend to backend.

---

## Phase 5 — IPFS

Implement:

* Pinata integration
* Video upload
* CID storage
* Metadata storage

Test with small files first.

---

## Phase 6 — Video Playback

Implement:

* Video retrieval
* IPFS playback
* Video metadata
* Watch page

---

## Phase 7 — Algorand Fundamentals

Before building rewards:

Learn and test:

* Algorand Testnet
* Wallet
* Address
* Transaction
* ALGO
* SDK
* Transaction confirmation

Perform a simple Testnet transaction independently.

---

## Phase 8 — Pera Wallet

Implement:

* Connect wallet
* Display address
* Disconnect
* Wallet state

Do not implement rewards yet.

---

## Phase 9 — Web3 Authentication

Implement:

* Challenge generation
* Wallet signing
* Signature verification
* JWT/session

---

## Phase 10 — View Tracking

Implement:

* View events
* Validation
* Duplicate protection
* Database records

---

## Phase 11 — Reward Engine

Implement:

* Reward rules
* Creator balance
* Reward ledger
* Settlement threshold

---

## Phase 12 — Blockchain Settlement

Implement:

* Algorand transaction creation
* Secure transaction signing
* Transaction submission
* Confirmation
* Transaction ID storage
* Settlement status

Use Testnet first.

---

## Phase 13 — Advertising

Implement:

* Advertiser dashboard
* Campaign creation
* Campaign budget
* Campaign status
* Campaign analytics

---

## Phase 14 — Creator Studio

Implement:

* Analytics
* Videos
* Views
* Revenue
* Rewards
* Wallet
* Settlements

---

## Phase 15 — Admin

Implement:

* User management
* Content moderation
* Advertisement monitoring
* Settlement monitoring
* Platform analytics

---

## Phase 16 — Security & Testing

Test:

* Authentication
* Authorization
* File uploads
* API validation
* Database operations
* IPFS
* Wallet authentication
* Reward calculations
* Blockchain settlements

---

## Phase 17 — Deployment

Deploy components individually.

Potential architecture:

```text
Frontend
   ↓
Cloud hosting

Backend
   ↓
Cloud backend hosting

Database
   ↓
Managed PostgreSQL

Video Storage
   ↓
IPFS / Pinata

Blockchain
   ↓
Algorand

Wallet
   ↓
Pera Wallet
```

Exact providers should be selected based on current requirements, cost, limits, and reliability when deployment begins.

---

# 34. CURRENT DEVELOPMENT STATUS

At the beginning of this rebuild:

```text
Project: OpenStream

Status:
Fresh rebuild

Existing knowledge:
- Original project architecture understood
- Problem and solution understood
- Basic full-stack concepts understood
- Basic Web3 concepts are currently being learned

New implementation:
Not started

Frontend:
Not started

Backend:
Not started

Database:
Not started

IPFS:
Not started

Algorand:
Not started

Pera Wallet:
Not started

Rewards:
Not started

Advertising:
Not started

Deployment:
Not started
```

---

# 35. IMPORTANT DEVELOPMENT RULE

When working with Antigravity:

**Do not automatically implement future phases.**

If the current task is Phase 1 UI design, do not start:

* FastAPI
* PostgreSQL
* IPFS
* Algorand
* Wallet integration
* Reward system

unless explicitly instructed.

If the current task is Phase 4 database development, do not suddenly implement blockchain.

Follow the current phase.

---

# 36. AI AGENT BEHAVIOR

AI coding agents should:

1. Read this file before making major architectural decisions.
2. Respect the current development phase.
3. Avoid unnecessary dependencies.
4. Explain significant architectural changes.
5. Prefer simple solutions before complex solutions.
6. Avoid premature optimization.
7. Avoid unnecessary abstraction.
8. Keep code modular.
9. Keep secrets out of source control.
10. Update documentation when architecture changes.
11. Test changes before considering a task complete.
12. Never silently change major architecture.
13. Ask for clarification when a decision materially changes the product.
14. Never assume that blockchain is required for every feature.
15. Never expose or request private keys unnecessarily.

---

# 37. AI TOOL USAGE

The project may use AI tools to accelerate:

* UI design
* Code generation
* Debugging
* Documentation
* Testing
* Architecture exploration
* Research

Potential tools:

* Antigravity
* Google Stitch
* Gemini
* GitHub
* Other appropriate developer tools

AI-generated code must still be:

* Understood
* Reviewed
* Tested
* Secured
* Integrated intentionally

---

# 38. SOURCE OF TRUTH PRIORITY

When making decisions, use this priority:

```text
1. Current explicit user requirement
2. Current project requirements
3. PROJECT_CONTEXT.md
4. Existing architecture
5. Framework/library best practices
6. AI assumptions
```

AI assumptions must never override explicit project requirements.

---

# 39. VERSION CONTROL

Use Git throughout development.

Recommended workflow:

```text
main
  |
  +--- feature/frontend
  +--- feature/backend
  +--- feature/ipfs
  +--- feature/algorand
  +--- feature/rewards
```

For a solo student project, a simpler branch strategy is acceptable.

Commit meaningful milestones.

Example:

```text
feat: create initial React application
feat: implement video feed UI
feat: add FastAPI health endpoint
feat: connect PostgreSQL
feat: integrate IPFS upload
feat: add Pera wallet connection
feat: implement wallet authentication
feat: implement reward calculation
feat: add Algorand settlement
```

---

# 40. TESTING PHILOSOPHY

Every major component should be testable independently.

Example:

```text
Frontend
    ↓
Test UI

Backend
    ↓
Test APIs

Database
    ↓
Test queries

IPFS
    ↓
Test upload/retrieval

Algorand
    ↓
Test Testnet transaction

Rewards
    ↓
Test calculations

Full System
    ↓
End-to-End testing
```

Do not wait until the end to test everything.

---

# 41. OBSERVABILITY

As the application grows, consider:

* Structured logging
* API error handling
* Database logging
* Blockchain transaction tracking
* Settlement status
* Upload status
* Basic health checks

At minimum, the backend should provide a health endpoint.

---

# 42. ERROR HANDLING

Errors should be:

* Predictable
* Structured
* User-friendly
* Logged appropriately

Never expose:

* Database credentials
* Private keys
* API secrets
* Internal stack traces

to normal users.

---

# 43. PERFORMANCE PRINCIPLES

Do not optimize prematurely.

Initially prioritize:

1. Correctness
2. Security
3. Maintainability
4. User experience
5. Performance

Later optimize:

* Video delivery
* Database queries
* API response times
* Caching
* Analytics
* Blockchain settlement processing

---

# 44. FUTURE POSSIBILITIES

Potential future features:

* Comments
* Likes
* Subscriptions
* Playlists
* Creator verification
* NFT-based creator memberships
* Token-based community features
* Decentralized identity
* DAO-like governance
* Recommendation engine
* AI video moderation
* AI content discovery
* AI-generated captions
* Multi-language subtitles
* Advanced analytics

These are NOT part of the initial MVP.

Do not implement them unless explicitly added to the roadmap.

---

# 45. MVP DEFINITION

The first meaningful MVP should be:

```text
User
 ↓
OpenStream
 ↓
Browse videos
 ↓
Watch video
 ↓
Creator uploads video
 ↓
Video stored through IPFS
 ↓
Metadata stored in PostgreSQL
 ↓
Creator connects Pera Wallet
 ↓
Wallet ownership verified
 ↓
Views tracked
 ↓
Rewards calculated
 ↓
Creator reward settled through Algorand Testnet
```

This is the core OpenStream experience.

---

# 46. SUCCESS CRITERIA

OpenStream is considered technically successful when:

* A creator can publish a video.
* The video is stored through IPFS.
* Metadata is stored in PostgreSQL.
* A viewer can discover and watch the video.
* Views are tracked by the backend.
* A creator can connect a Pera wallet.
* Wallet ownership can be verified.
* Rewards can be calculated.
* A reward can be settled through Algorand Testnet.
* The transaction can be verified on the blockchain.
* The creator can see the settlement status.
* The entire flow works end-to-end.

---

# 47. CURRENT NEXT OBJECTIVE

The immediate next objective is:

## PHASE 1 — UX/UI DESIGN

Before coding the application:

1. Define the visual identity of OpenStream.
2. Design the core user journey.
3. Create initial screens using Google Stitch.
4. Review and refine the UX.
5. Establish the design system.
6. Only then begin React implementation.

Initial screens:

```text
1. Landing Page
2. Home / Video Feed
3. Video Watch Page
4. Search
5. Creator Profile
6. Upload Video
7. Creator Dashboard
8. Wallet / Rewards
```

Start with the first five core screens before expanding into advertiser/admin interfaces.

---

# 48. FINAL PRINCIPLE

OpenStream is a learning-driven engineering project.

The objective is not merely to produce a working application.

The objective is to understand how these technologies work together:

```text
React
   +
FastAPI
   +
PostgreSQL
   +
IPFS
   +
Pinata
   +
Pera Wallet
   +
Algorand
   +
Web3 Authentication
   +
Reward Engine
   +
Advertising
```

The final system should demonstrate that traditional full-stack engineering and Web3 technologies can be combined deliberately rather than forcing blockchain into every part of the application.

Build slowly.

Understand each layer.

Test each layer.

Then integrate.

**OpenStream should be built one working layer at a time.**
