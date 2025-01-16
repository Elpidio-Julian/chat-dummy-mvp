import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative h-[70vh] bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-gradient-to-r from-indigo-600/20 to-purple-600/20" />
        </div>
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="w-full md:w-3/4 lg:w-2/3">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white">
              <span className="block mb-2">A better way to</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">communicate</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300 max-w-2xl">
              Connect with your team in real-time, share ideas, and get work done faster with our modern communication platform.
            </p>
            <div className="mt-8">
              {currentUser ? (
                <button
                  onClick={() => navigate('/chat')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-indigo-500/25"
                >
                  Open App
                </button>
              ) : (
                <button
                  onClick={() => navigate('/signup')}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-medium rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all duration-200 shadow-lg hover:shadow-indigo-500/25"
                >
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-indigo-400 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-4xl font-bold text-white">
              Everything you need to stay connected
            </p>
          </div>

          <div className="mt-20">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-x-16 lg:gap-y-12">
              {[
                {
                  title: 'Real-time messaging',
                  description: 'Instant message delivery for fluid conversations with your team.',
                  icon: '💬'
                },
                {
                  title: 'Channel organization',
                  description: 'Keep discussions organized with dedicated channels for every topic.',
                  icon: '📂'
                },
                {
                  title: 'User presence',
                  description: "See who is online and available for collaboration.",
                  icon: '👥'
                },
                {
                  title: 'Simple and intuitive',
                  description: 'Clean interface that helps you focus on what matters most.',
                  icon: '✨'
                }
              ].map((feature, index) => (
                <div key={index} className="relative bg-gray-800 rounded-xl p-8 hover:bg-gray-750 transition-colors duration-200">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 