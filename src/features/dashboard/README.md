# Dashboard feature

## Purpose

Hosts the faithfully migrated legacy service application, including data entry, dashboard, history, member management, activities, backups, profile, Reports-only Excel export, and print export flows.

## Components

`components/dashboard-application.jsx` is the complete interactive component tree.
It remains together because its internal components share local state and
behavior-sensitive helpers; splitting it would exceed an architecture-only
refactor.

## Hooks, services, and data

The feature retains its existing React hooks and interaction behavior without
behavioral changes. Persistence is delegated to feature-owned data services.

## Dependencies

React, Recharts, and SheetJS (`xlsx`) for Reports exports only.

## Exports

The default export in `index.tsx` is the page feature consumed by the Next.js dashboard route.
