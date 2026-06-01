# PlaceIQ Frontend Documentation

## Overview

The PlaceIQ frontend is a robust Single Page Application (SPA) built with React 19 and Vite. It serves as the primary interface for Students, Administrators (TPOs), Companies, and Alumni, featuring real-time data synchronization, a drag-and-drop Kanban interface, and an embedded code editor.

## Technology Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.0
- **State Management & Data Fetching**: TanStack React Query (v5)
- **Real-time Communication**: Socket.io Client
- **Interactive UI Components**: 
  - `@dnd-kit` for Kanban boards
  - `framer-motion` for transitions
  - `@monaco-editor/react` for the assessment IDE
  - `recharts` for analytics dashboards
- **Routing**: React Router DOM (v7)

## Frontend Architecture

The application implements a modular component architecture with strict role-based route protection.

```mermaid
graph TD
    App[App.jsx - Main Router]
    Auth[Authentication Context\nuseAuth]
    Guards[Protected Route Wrapper]
    
    Layout[App Layout Component]
    Sidebar[Role-based Sidebar]
    Topbar[Navigation & Notifications]
    
    Pages[Role-Specific Pages]
    AdminPages[Admin Dashboard]
    StudentPages[Student Dashboard]
    CompanyPages[Company Dashboard]
    AlumniPages[Alumni Dashboard]
    
    App --> Auth
    App --> Guards
    Guards --> Layout
    Layout --> Sidebar
    Layout --> Topbar
    Layout --> Pages
    
    Pages --> AdminPages
    Pages --> StudentPages
    Pages --> CompanyPages
    Pages --> AlumniPages
```

## Data Fetching and State Synchronization

The client utilizes TanStack Query for caching and synchronizing server state, coupled with an Axios instance handling interceptors for authentication.

```mermaid
sequenceDiagram
    participant Component
    participant ReactQuery as TanStack Query
    participant Axios
    participant Server

    Component->>ReactQuery: useQuery(['jobs'])
    alt Cache is valid
        ReactQuery-->>Component: Return Cached Data
    else Cache invalid or missing
        ReactQuery->>Axios: Fetch Data
        Axios->>Axios: Request Interceptor (Attach JWT)
        Axios->>Server: GET /api/jobs
        Server-->>Axios: HTTP 200 OK
        Axios->>Axios: Response Interceptor
        Axios-->>ReactQuery: Data Payload
        ReactQuery->>ReactQuery: Update Cache
        ReactQuery-->>Component: Return Fresh Data
    end
```

## Real-time WebSocket Implementation

The `useSocket` context provider initializes the Socket.io connection and manages real-time event listeners.

```mermaid
flowchart LR
    SocketContext[Socket Provider]
    Server[Node.js WebSocket Server]
    
    Server -->|application:status_changed| SocketContext
    Server -->|job:new_posted| SocketContext
    Server -->|admin:announcement| SocketContext
    
    SocketContext --> Toast[Trigger UI Notification]
    SocketContext --> Badge[Update Unread Badge]
    SocketContext --> Query[Invalidate React Query Cache]
```

## Directory Structure

```text
client/src/
├── api/              # Axios configuration and interceptors
├── assets/           # Static media assets
├── components/       # Reusable UI elements
│   ├── common/       # Shared components (ProtectedRoute)
│   ├── layout/       # Structural components (AppLayout, Sidebar)
│   └── ui/           # Base elements (Buttons, Spinners)
├── hooks/            # Custom React hooks (useAuth, useSocket)
├── lib/              # Utility functions (Tailwind class mergers)
├── pages/            # Routable view components separated by role
└── main.jsx          # Application entry point
```

## Development Commands

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Bundles the application for production deployment.
- `npm run preview`: Serves the production build locally for testing.
- `npm run lint`: Executes ESLint for code quality analysis.
