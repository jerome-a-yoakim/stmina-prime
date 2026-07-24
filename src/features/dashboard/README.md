# Dashboard feature

## Purpose

Hosts the faithfully migrated legacy service application, including data entry, dashboard, history, member management, activities, backups, profile, Excel export/import, and print export flows.

## Components

`LegacyApplication.jsx` is the complete original interactive component tree. It remains together temporarily because its internal components share local state and storage helpers.

## Hooks, services, and data

The feature retains the prototype's existing React hooks, validation, mock seed data, and browser-local storage behavior without behavioral changes.

## Dependencies

React, SheetJS (`xlsx`), and Recharts.

## Exports

The default export in `index.tsx` is the page feature consumed by the Next.js dashboard route.
