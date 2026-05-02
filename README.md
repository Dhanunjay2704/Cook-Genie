# AI Recipe Generator Backend

A robust Express.js backend for an AI-powered recipe generator using MongoDB Atlas and GROQ AI.

## 🚀 Features

- **AI Recipe Generation**: Generate recipes using GROQ AI
- **Image Analysis**: Analyze food images for recipe suggestions
- **Recipe Storage**: Save and manage recipes in MongoDB
- **Robust Error Handling**: Graceful handling of database failures
- **Production Ready**: Proper logging, graceful shutdown, and environment management

## 📋 Prerequisites

- Node.js 16+
- MongoDB Atlas account
- GROQ API key

## 🛠️ Installation

1. **Clone and navigate to server directory:**
   ```bash
   cd Server-Files
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your actual values:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority&appName=Cluster0
   GROQ_API_KEY=your_groq_api_key_here
   ```

## 🔧 MongoDB Atlas Setup

1. **Create MongoDB Atlas Cluster**
2. **Configure Network Access:**
   - Go to Network Access → Add IP Address
   - Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
3. **Create Database User:**
   - Go to Database Access → Add New Database User
   - Choose "Read and write" permissions
4. **Get Connection String:**
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string and update your `.env`

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Debug Mode
```bash
npm run debug
```

## 📡 API Endpoints

- `GET /api/health` - Health check
- `POST /api/recipes/analyze` - Analyze food image
- `POST /api/recipes/generate` - Generate recipe
- `POST /api/recipes/suggestions` - Generate multiple recipes
- `POST /api/recipes/save` - Save recipe
- `GET /api/recipes/saved` - Get saved recipes
- `GET /api/recipes/saved/:id` - Get specific recipe
- `DELETE /api/recipes/saved/:id` - Delete recipe

## 🔍 Troubleshooting

### MongoDB Connection Issues

**Error: `querySrv ECONNREFUSED`**
- Check if your MongoDB Atlas cluster is not paused
- Verify Network Access allows your IP (or 0.0.0.0/0 for testing)
- Confirm your connection string is correct
- Check your database user credentials

**Error: `EADDRINUSE: address already in use :::5000`**
- The server will automatically try the next available port
- Or manually kill the process using the port

### Common Issues

1. **Server crashes on startup:**
   - Check your `.env` file has all required variables
   - Ensure MongoDB Atlas cluster is active

2. **Database operations fail:**
   - Server continues running even if DB is unavailable
   - Check `/api/health` endpoint for database status

3. **Port conflicts:**
   - Server automatically finds available ports
   - Check console output for actual port number

## 📁 Project Structure

```
Server-Files/
├── config/
│   └── db.js              # Database connection logic
├── controllers/
│   └── recipeController.js # Route handlers
├── middleware/
│   └── upload.js          # File upload middleware
├── models/
│   └── Recipe.js          # MongoDB schemas
├── routes/
│   └── recipeRoutes.js    # API routes
├── uploads/               # Uploaded images
├── .env                   # Environment variables
├── .env.example          # Environment template
├── index.js              # Main application file
├── nodemon.json          # Nodemon configuration
└── package.json          # Dependencies and scripts
```

## 🛡️ Error Handling

- **Database Failures**: Server continues running, API returns appropriate error responses
- **Invalid Requests**: Proper validation and error messages
- **File Uploads**: Size limits and type validation
- **Graceful Shutdown**: Proper cleanup on process termination

## 🔄 Development Workflow

1. Make changes to code
2. Nodemon automatically restarts server
3. Check console for connection status
4. Test endpoints with your frontend or tools like Postman
5. Monitor `/api/health` for system status

## 📊 Monitoring

- Health endpoint: `GET /api/health`
- Console logs for all operations
- Database connection status tracking
- Automatic retry logic for failed connections

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use proper environment variables
3. Configure CORS with your frontend URL
4. Set up proper logging
5. Use a process manager like PM2

```bash
NODE_ENV=production npm start
```