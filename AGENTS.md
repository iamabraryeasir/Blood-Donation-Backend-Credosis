# Agent Directives and System Architecture (AGENTS.md)

This document establishes the architectural boundaries, technology stack, and strict coding conventions for the MVP backend development. All automated agents, copilots, and human contributors must adhere to these rules to ensure systemic consistency, type safety, and maintainability.

## 1. Core Technology Stack

All generated code must strictly utilize the following stack. Do not introduce alternative libraries or frameworks for these core responsibilities:

- **Runtime:** Node.js
- **Language:** TypeScript (Strict mode enabled)
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Validation:** Zod
- **Formatting & Linting:** Biome (Do not use ESLint or Prettier)
- **Documentation:** Swagger / OpenAPI

## 2. Architectural Pattern: Domain-Driven Modular Design

The repository strictly follows a Feature-Sliced Modular Architecture. Do not use legacy MVC structures that group files by technical concern (e.g., global `controllers` or `services` folders).

- **Domain Isolation:** The codebase is organized by business domains (e.g., Users, Requests, System).
- **Module Cohesion:** Every domain module is self-contained and encapsulates its own routing, controllers, business logic (services), and validation schemas.
- **Separation of Concerns:**
    - **Routes:** Define HTTP methods and attach middleware.
    - **Controllers:** Handle request/response cycles and invoke Zod validation. No business logic is permitted here.
    - **Services:** House all business logic, algorithms (e.g., matching logic), and state mutations.
    - **Cross-Module Communication:** Modules may only interact with other modules via their Service layers. Controllers must never call other Controllers.

## 3. Role-Based Access Control (RBAC)

The system enforces strict role boundaries. Ensure all protected operations validate the actor's role before execution.

- **ADMIN:** Possesses full administrative privileges. Responsible for system oversight, user management, and manually transitioning requests through the approval gate.
- **USER:** Standard application users. Authorized to create blood donation requests and respond to matching events. Limited to interacting with their own data resources.

## 4. State Management & Data Modeling

The application lifecycle is governed by deterministic database enums. All conditional logic must rely on these states:

- **System Roles (`Role`):** `USER`, `ADMIN`
- **Request Lifecycle (`RequestStatus`):**
    - `PENDING_APPROVAL`: The initial state of a request created by a `USER`. It remains inactive until verified.
    - `ACTIVE`: Approved by an `ADMIN`. The request is now visible to the matching engine.
    - `REJECTED`: Denied by an `ADMIN` (e.g., flagged as fraudulent or lacking valid documentation).
    - `FULFILLED`: The request lifecycle is complete, and the blood requirement has been met.

## 5. Strict Engineering Directives

Agents generating or modifying code must enforce the following rules:

- **End-to-End Type Safety:** Types must flow directly from the database schema to the HTTP response. Use Prisma-generated types for data access and infer TypeScript types directly from Zod schemas for application logic. Do not manually declare interfaces that duplicate Prisma or Zod definitions.
- **Fail-Fast Configuration:** Environment variables must be validated via Zod during application bootstrap. The application must crash immediately if required configurations are missing or malformed.
- **Centralized Error Handling:** Never leak raw database errors or stack traces to the client. Throw custom application errors (e.g., `AppError`) within services, and utilize a global Express error middleware to catch, format, and return standard JSON error responses.
- **Biome Enforcement:** Adhere to Biome's formatting and linting rules. Avoid `any` types, enforce explicit return types for core services, and maintain strict naming conventions.
