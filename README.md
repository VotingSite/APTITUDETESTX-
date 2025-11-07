# Aptitude Test X

Advanced Aptitude Testing Platform with AI-powered question generation, real-time analytics, and gamified learning experiences.

## 🚀 Features

- **AI-Powered Question Generation** - Generate high-quality questions using Google Gemini AI
- **Real-time Analytics** - Track student performance and progress
- **Question Bank Management** - Organize questions into categorized banks
- **Bulk Operations** - Select and manage multiple questions efficiently
- **Admin & Student Dashboards** - Role-based interfaces for different user types
- **Firebase Integration** - Secure authentication and data storage
- **Responsive Design** - Works seamlessly on all devices

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Hosting)
- **AI**: Google Gemini API
- **UI Components**: Radix UI, Lucide Icons, Framer Motion
- **Build Tool**: Vite

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd aptitude-test-x
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Configure Firebase**
   - Update `src/lib/firebase-config.ts` with your Firebase project configuration
   - Ensure Firebase Authentication and Firestore are enabled

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Firebase Hosting

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Environment Variables for Production

Set the following environment variables in your hosting platform:
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key

## 📋 Usage

### Admin Features
- Create and manage questions
- Generate questions with AI
- Organize questions into banks
- Bulk delete operations
- Monitor student activity
- View analytics and reports

### Student Features
- Take adaptive tests
- View progress and results
- Access gamified learning modules
- Track performance over time

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication (Email/Password, Google)
3. Enable Firestore Database
4. Update the configuration in `src/lib/firebase-config.ts`

### Gemini AI Setup
1. Get an API key from Google AI Studio
2. Set it as `VITE_GEMINI_API_KEY` environment variable
3. The AI question generation will be available in the Question Bank

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private project. Contact the development team for contribution guidelines.

## 📞 Support

For support or questions, please contact the development team.
@saadparkar 
