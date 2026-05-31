# 🖥️ PlaceIQ: Frontend Engineering Documentation

> **React 19 Single Page Application**  
> *A high-performance, real-time campus recruitment dashboard built with Vite, Tailwind CSS 4.0, TanStack Query, Framer Motion, and WebSockets.*

---

## 🛠️ Technology Stack & Visual Architecture

The frontend of PlaceIQ is designed as a modern, high-fidelity command center focusing on exceptional UX/UI, glassmorphism, responsive grids, and micro-animations.

*   **Core Engine**: React 19 (SPA) bundled via the super-fast **Vite** build tool.
*   **Aesthetic Styling**: **Tailwind CSS v4.0** utilizing a hybrid CSS-in-JS design system with Outfit and Inter font families, custom animations, and glassmorphic panels (`backdrop-blur-xl`).
*   **State & API Hydration**: **TanStack React Query (v5)** for declarative asynchronous state caching, query mutations, and automatic data refetching.
*   **Interactive IDE Workspace**: Integrated **`@monaco-editor/react`** (Monaco Engine) serving as the coding canvas for candidate programming rounds.
*   **Visual Intelligence & Charts**: **Recharts** for student score metrics, application status metrics, and placement trends.
*   **Fluid Animations**: **Framer Motion** orchestrating transitions, sidebars, and slide-in ATS cards.
*   **Drag-and-Drop ATS board**: **`@dnd-kit/core`** and `@dnd-kit/sortable` driving the applicant tracking pipeline.
*   **Real-time Synchronization**: **`socket.io-client`** linking directly to the backend events pipeline.

---

## 📁 Frontend Directory Deep Dive

```
client/src/
├── api/
│   └── axios.js            # Axios client, request & response interceptors
├── components/
│   ├── common/
│   │   └── ProtectedRoute.jsx  # Role validation and auth guard wrapper
│   ├── layout/
│   │   ├── AppLayout.jsx   # Layout skeleton binding Sidebar & Topbar
│   │   ├── Sidebar.jsx     # Dynamic role-specific sidebar navigation
│   │   └── Topbar.jsx      # Notifications drawer, presence indicator & profile
│   └── ui/                 # Reusable buttons, badges, modals, spinners, and inputs
├── hooks/
│   ├── useAuth.jsx         # Authentication context (profile persistence)
│   └── useSocket.jsx       # WebSocket context, toast dispatch, notification history
├── pages/                  # Page Workspaces categorized by role
│   ├── Landing.jsx         # Landing page
│   ├── Login.jsx           # OTP and password-based login dashboard
│   ├── Register.jsx        # Account registration
│   ├── ResetPassword.jsx   # Token-based password resets
│   ├── admin/              # TPO Administration panel files
│   ├── student/            # Candidate portal files
│   ├── company/            # Corporate recruiter workspace files
│   └── alumni/             # Alumni network workspace files
├── lib/
│   └── tw.js               # Tailwind class merger utilities (clsx + tailwind-merge)
└── main.jsx                # DOM mounting & Context Providers initialization
```

---

## 🔑 Layout Framework & Guard Routing

Security and role-based permissions are enforced right at the routing layer in `App.jsx`:

### 1. Route Protection & Guards (`ProtectedRoute.jsx`)
```jsx
// client/src/components/common/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  const currentRole = user?.user?.role || user?.role;
  if (roles && !roles.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children ? children : <Outlet />;
}
```
If a student attempts to access `/admin/dashboard`, `ProtectedRoute` intercepts the route parameters, verifies the JWT's claims in memory, and immediately redirects them to `/unauthorized`.

### 2. Monorepo Route Organization
The portal separates workspaces by wrapping them inside the global layout skeleton:
*   **AppLayout**: Mounts the responsive `Sidebar` on the left and `Topbar` on the top. Sub-routes render in the middle using React Router's `<Outlet />`.
*   **AssessmentWorkspace**: Rendered as a *standalone* canvas (omitting standard sidebars) to give the student a distraction-free, exam-secure coding workspace.

---

## 🌐 Network Interfacing & Caching

PlaceIQ manages caching and REST communications through structured interlocked layers.

### 1. Centralized HTTP Client (`axios.js`)
*   **Request Interceptor**: Automatically pulls the authentication token from `placeiq_profile` in local storage and mounts it as the `Authorization: Bearer <JWT>` header before every request.
*   **Response Interceptor**: Intercepts server responses. If it encounters a `401 Unauthorized` status code, it clears the local storage profile and forces a logout redirect.

### 2. State Synchronization with TanStack Query
We use standard cache keys to ensure instant updates:
```javascript
// Example Job Application Submission
const queryClient = useQueryClient();

const applyMutation = useMutation({
  mutationFn: (jobId) => API.post('/applications/apply', { jobId }),
  onSuccess: () => {
    // Invalidate queries to automatically refetch fresh application counts
    queryClient.invalidateQueries({ queryKey: ['applications'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    toast.success('Successfully applied for this role!');
  }
});
```

---

## 🔌 Socket.io Events & Real-time Client Engine (`useSocket.jsx`)

When a user logs in, `SocketProvider` establishes a persistent connection to the Node.js socket server, immediately performing two actions:
1.  **`join_room`**: Joins a socket room dedicated to the user's specific database ID to receive targeted updates.
2.  **`join_admin_room`**: If the logged-in role is an `admin`, they automatically join `room:admins` for global system logs and presence updates.

### Supported Real-time Event Receivers:
*   **`application:status_changed`**: Triggers when a candidate is pushed along the ATS pipeline. Builds a glowing, glassmorphic toast notification detailing the company and the new stage, updating the unread notification badge on the Topbar.
*   **`job:new_posted`**: Triggers when a company gets a job approved. Students receive a toast announcing the job role and salary package, complete with a call-to-action to review it.
*   **`admin:announcement`**: Broad broadcasts issued by TPOs (e.g. "Placement drive deadline extended") pop up on all connected screens in real-time.
*   **`presence:update`**: Active user count changes are pushed straight to the `room:admins` group, giving admins live visibility of active placement platform users.

---

## 🎨 Visual Aesthetics & Micro-interactions

A premium user interface is critical to PlaceIQ's user experience. We accomplish this using several techniques:
*   **Glassmorphism**: Core cards and dashboards utilize a custom glassmorphism mix:
    ```css
    bg-white/80 backdrop-blur-xl border border-white/40 shadow-xl
    ```
*   **Animations**: Built using custom Framer Motion rules:
    *   **Sidebars**: Compress and expand dynamically.
    *   **Kanban Cards**: Reorder with smooth spring transitions.
    *   **Page Transitions**: Route changes fade and slide up cleanly.
*   **Typography**: Outfitted with Google Fonts (Outfit for headers, Inter for tabular and dashboard contents) rather than browser defaults.

---

## 🚀 Execution Scripts

To run the client workspace locally:

| Command | Action |
|:---|:---|
| `npm run dev` | Spins up the local Vite development server on port 5173. |
| `npm run build` | Bundles and minifies all source files into the `/dist` directory for production. |
| `npm run preview` | Runs a local server to test the compiled production build. |
| `npm run lint` | Analyzes code quality using ESLint. |
