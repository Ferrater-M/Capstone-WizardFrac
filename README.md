# WizardFrac

WizardFrac is a free, game-based fraction assessment tool for Grade 4 students, aligned with the Philippine MATATAG curriculum. It transforms fraction addition and subtraction into an interactive wizard-themed adventure, helping learners understand mathematical concepts through visual, game-based problem solving.

## Overview

Fractions are one of the most challenging topics for elementary learners, especially when instruction focuses only on abstract rules and procedures. Many students struggle because they are not given enough visual and conceptual support, and teachers often lack real-time insight into where misconceptions occur.

WizardFrac addresses these gaps by combining:
- visual fraction mechanics
- step-by-step problem solving
- game-based progression and immediate feedback
- detailed student performance tracking for teachers

The project focuses on two core fraction strategies:
- Same Container method for similar fractions
- Butterfly Method for dissimilar fractions

It also supports mixed fractions by converting them into improper fractions before applying the appropriate strategy.

## Why This Project Matters

This project aims to make mathematics more engaging and more understandable for young learners. Instead of simply asking students to apply formulas, WizardFrac helps them see how the math works through a game environment that turns each step into a meaningful action.

The system captures student interactions such as piece selection, cross-product decisions, simplification steps, and timing so teachers can identify misconceptions like:
- numerator mistakes
- cross-multiplication errors
- simplification failures
- incorrect interpretation of mixed fractions

## Team

- Ballener, John Mark
- Moreno, Elaiza Jane R.
- Ferrater, Marilou
- Ybanez, Matt
- Cabrera, Alden

Team Code: 20

## Key Features

### Core game modules
- Similar Island: adding and subtracting similar fractions
- Dissimilar Island: adding and subtracting dissimilar fractions
- Hybrid Island: mixed and combined fraction challenges

### Additional features
- 3-life system with streak-based score multiplier
- Real-time feedback with animations and hints
- Step-level error tracking and diagnostic reporting
- Character selection, lobby flow, and island progression
- Student progress monitoring and gameplay history
- Leaderboard and score-based progression

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- HTML5 and CSS
- Game UI and animation assets

### Backend
- Java
- Spring Boot
- Spring Data JPA
- Spring Security
- REST API architecture

### Database
- PostgreSQL / Supabase
- H2 database for local development fallback

### Deployment
- Web-based application for laptops and desktops
- Git and GitHub for version control

## Curriculum Alignment

WizardFrac is aligned with the Philippine MATATAG curriculum:
- Q2 Competencies 14a–14e: adding and subtracting similar fractions (proper and improper)
- Q3 Competencies 10a–10e: adding and subtracting dissimilar fractions (proper and improper)
- Mixed fractions: conversion to improper form and correct strategy application

## Research Contributions

This project is designed to provide empirical evidence on:
- whether visual, mechanic-based learning improves procedural and conceptual understanding in Grade 4 classrooms
- which fraction misconceptions are most common among Filipino students
- the effectiveness of the Same Container and Butterfly Method visualizations as learning strategies

## Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- npm
- Git

### Backend
```bash
cd backend
./gradlew bootRun
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment setup
Create the backend environment file as needed for database and mail configuration:
- `backend/.env.example`
- `backend/src/main/resources/application.properties`

The frontend connects to the backend at:
```text
http://localhost:8082
```
unless `VITE_API_URL` is configured.

## Configuration

The project uses environment-based configuration for:
- database credentials
- mail and diagnostics support
- local and production runtime settings

The backend is configured to use PostgreSQL/Supabase when available and falls back to an in-memory H2 database for local development if the external database is not reachable.

## License

This project does not currently include a license file. If the project is intended for public or institutional release, consider adding an appropriate open-source license such as MIT or Apache 2.0.

