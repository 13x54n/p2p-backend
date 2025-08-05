# P2P Backend

A modern Node.js backend API built with Express.js, featuring authentication, rate limiting, and comprehensive error handling.

## Features

- 🚀 **Express.js** - Fast, unopinionated web framework
- 👥 **User Management** - Complete user CRUD operations
- 🛡️ **Security Middleware** - Helmet, CORS, rate limiting
- 📊 **MongoDB Integration** - Mongoose ODM for database operations
- ✅ **Input Validation** - Express-validator for request validation
- 🧪 **Testing** - Jest and Supertest for API testing
- 📝 **Logging** - Morgan for HTTP request logging
- 🔧 **Development Tools** - Nodemon, ESLint

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd p2p-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit the `.env` file with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/p2p-backend
```

5. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users/google` - Create/update user from Google Sign-In
- `POST /api/users/logout` - Logout user (set isActive to false)
- `GET /api/users/uid/:uid` - Get user by Google UID
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/search` - Search users

### Orders
- `POST /api/orders` - Create a new buy/sell order
- `GET /api/orders` - Get all orders with filters
- `GET /api/orders/stats` - Get order statistics
- `GET /api/orders/user/:uid` - Get user's orders by Google UID
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Logs
- `GET /api/logs` - Get logs for a specific route
- `GET /api/logs/recent` - Get recent logs from all routes
- `GET /api/logs/stats` - Get log statistics
- `DELETE /api/logs/clear` - Clear old logs

### Health Check
- `GET /api/health` - Health check endpoint

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
└── server.js        # Main server file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/p2p-backend |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `LOG_LEVEL` | Logging level (ERROR, WARN, INFO, DEBUG) | INFO |

## Logging System

The application includes a comprehensive logging system that automatically logs all API requests, responses, and errors. Logs are organized by route type and stored in daily files.

### Log Structure
- **Route-specific logs**: `logs/routes/{route_type}/{date}.log`
- **Log types**: users, orders, health, errors, access
- **Log levels**: ERROR, WARN, INFO, DEBUG

### Log Content
Each log entry includes:
- Timestamp
- Log level
- Message
- Request details (method, URL, IP, user agent)
- Response details (status code, response time)
- User context (UID when available)
- Request body (for non-GET requests)
- Query parameters

### Log Management
- **View logs**: Use `/api/logs` endpoints
- **Auto-cleanup**: Logs older than 30 days are automatically cleaned up
- **Manual cleanup**: Use `DELETE /api/logs/clear?days=30`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and tests
6. Submit a pull request

## License

MIT License - see LICENSE file for details 