# CodeSnippet - Cloud-Based Code Snippet Manager

A full-stack web application for managing code snippets, built with Node.js, React, MongoDB Atlas, Firebase Authentication, and deployed on Vercel.

## Security Considerations

Before deploying or sharing this project, ensure you:

1. Never commit sensitive information:

   - Environment variables (.env files)
   - API keys
   - Firebase service account credentials
   - MongoDB connection strings
   - Any other sensitive credentials

2. Set up proper environment variables in your deployment platform (Vercel)

3. Configure proper CORS settings for your domains

4. Set up proper Firebase security rules

5. Use environment variables for all sensitive configuration

## Features

- Google Sign-In authentication
- Create, read, and delete code snippets
- Syntax highlighting for multiple programming languages
- Modern, responsive UI with Tailwind CSS
- Serverless architecture
- Cloud-based database with MongoDB Atlas

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Firebase project
- Vercel account

## Project Structure

```
cloud-snippet-manager/
├── backend/
│   ├── index.js
│   ├── models/
│   │   └── Snippet.js
│   ├── routes/
│   │   └── snippetRoutes.js
│   ├── middleware/
│   │   └── auth.js
│   ├── .env
│   ├── package.json
│   └── vercel.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── firebase.js
│   ├── .env
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Firebase project
- Vercel account

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Firebase configuration

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your MongoDB and Firebase configuration

## Development

1. Start the backend server:

   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

## Deployment

### Backend Deployment

1. Deploy to Vercel:

   ```bash
   cd backend
   vercel
   ```

2. Set up environment variables in Vercel dashboard

### Frontend Deployment

1. Deploy to Vercel:

   ```bash
   cd frontend
   vercel
   ```

2. Set up environment variables in Vercel dashboard

## Security Best Practices

1. Always use environment variables for sensitive data
2. Keep dependencies updated
3. Implement proper error handling
4. Use HTTPS in production
5. Implement rate limiting
6. Use proper authentication and authorization
7. Sanitize user inputs
8. Implement proper CORS policies

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## API Endpoints

- `POST /api/snippets` - Create a new snippet
- `GET /api/snippets` - Get all snippets for the authenticated user
- `GET /api/snippets/:id` - Get a specific snippet
- `PUT /api/snippets/:id` - Update a snippet
- `DELETE /api/snippets/:id` - Delete a snippet

## Technologies Used

- Frontend:

  - React
  - Vite
  - Tailwind CSS
  - Firebase Authentication
  - React Syntax Highlighter
  - Axios

- Backend:
  - Node.js
  - Express
  - MongoDB Atlas
  - Firebase Admin SDK
  - Vercel Serverless Functions
