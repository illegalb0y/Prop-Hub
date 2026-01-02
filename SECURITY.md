# Security and Administration

This document outlines the security hardening and administration infrastructure implemented in PropertyHub.

## Security Tech Stack

*   **Rate Limiting**: Custom TTL-based in-memory store with per-route configuration.
*   **RBAC (Role-Based Access Control)**: Middleware-driven permission system using PostgreSQL user roles.
*   **IP Banning**: Persistent IP/CIDR banning system with high-performance memory caching (60s TTL).
*   **CSRF Protection**: Token-based protection with double-submit cookie pattern.
*   **Security Headers**: Implementation of HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.
*   **Input Validation**: Strict schema validation for all API inputs using **Zod**.
*   **Audit Logging**: Comprehensive activity tracking for all administrative actions.

## Core Features

### 1. Hardened API Security
All API endpoints are protected by multi-layered security middleware:
- **IP Ban Check**: Immediate rejection of requests from blacklisted IPs.
- **Rate Limiting**: Prevent brute-force and DoS attacks (Auth: 5 req/min, Projects: 60 req/min).
- **Session Security**: Secure, HTTP-only, and SameSite-compliant session cookies.
- **CSRF Validation**: Mandatory tokens for all mutating operations (POST/PUT/DELETE).

### 2. Administrative Console (`/secret_admin`)
A restricted dashboard for authorized administrators providing:
- **Project Management**: Soft-delete and restoration of project listings.
- **User Moderation**: Ability to ban/unban users and promote users to admin status.
- **IP Management**: Real-time IP banning interface with reason tracking.
- **CSV Data Import**: Asynchronous processing of bulk project data with detailed error reporting.
- **System Audit Log**: Full visibility into administrative actions, including IP and timestamp tracking.

### 3. Data Integrity
- **Soft Deletes**: Projects are never permanently removed from the database via the admin console, allowing for accidental deletion recovery.
- **Schema Validation**: All data passing through the system is validated against Drizzle-Zod schemas to prevent injection and malformed data.
