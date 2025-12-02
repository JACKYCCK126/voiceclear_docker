# AI 降噪與語音突顯技術

## Overview

This is a React-based web application for audio separation processing that uses a machine learning model to separate audio sources. The application provides a user-friendly interface for uploading audio files, monitoring processing progress, and downloading the processed results. It integrates with an external audio processing backend service and displays real-time feedback including SI-SNR (Signal-to-Interference-plus-Noise Ratio) improvement metrics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: wouter for lightweight client-side routing
- **UI Framework**: shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and data fetching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Component Structure
- **Main Components**: AudioUploader, ProcessingProgress, ResultsDisplay, ErrorDisplay
- **UI Components**: Comprehensive shadcn/ui component library including cards, buttons, dialogs, forms, and navigation
- **Custom Hooks**: useAudioSeparation for managing audio processing workflow, use-toast for notifications

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Development Setup**: Hot module replacement via Vite middleware in development
- **Storage Layer**: Abstracted storage interface with in-memory implementation for user management
- **API Design**: RESTful API structure with /api prefix routing

### Data Management
- **Database**: Drizzle ORM configured for PostgreSQL with Neon Database serverless connection
- **Schema Management**: Centralized schema definitions in shared directory using Zod for validation
- **Migration System**: Drizzle Kit for database migrations and schema management

### Audio Processing Integration
- **External API**: Integration with external audio separation service via configurable baseURL
- **File Handling**: Support for multiple audio formats (WAV, MP3, FLAC, OGG, M4A) with 50MB size limit
- **Progress Tracking**: Real-time polling system for monitoring processing status
- **Result Management**: Download mechanism for processed audio files with quality metrics

### Development Tools
- **Build System**: Vite with React plugin and runtime error overlay
- **Code Quality**: TypeScript with strict configuration and path aliases
- **Styling**: Tailwind CSS with custom design system variables and dark mode support
- **Development Environment**: Replit-specific configurations and cartographer plugin

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (wouter), TanStack Query
- **UI Framework**: Radix UI primitives, Tailwind CSS, class-variance-authority for component variants
- **Form Management**: React Hook Form, @hookform/resolvers for validation integration
- **Validation**: Zod for runtime type checking and schema validation

### Backend Dependencies
- **Server**: Express.js, TypeScript runtime (tsx), esbuild for production builds
- **Database**: Drizzle ORM, @neondatabase/serverless for database connectivity
- **Session Management**: connect-pg-simple for PostgreSQL session storage

### Development Dependencies
- **Build Tools**: Vite, @vitejs/plugin-react, TypeScript compiler
- **Replit Integration**: @replit/vite-plugin-runtime-error-modal, @replit/vite-plugin-cartographer
- **Styling**: PostCSS, Autoprefixer for CSS processing

### Audio Processing Service
- **External Backend**: Configurable ngrok tunnel or external API endpoint
- **File Upload**: Multipart form data handling for audio file uploads
- **Real-time Communication**: Polling-based status updates and progress tracking
- **Result Delivery**: Blob-based file download system for processed audio