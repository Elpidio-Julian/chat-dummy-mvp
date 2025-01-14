import { useAuth } from '../contexts/AuthContext';

export default function Chat() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] min-w-screen bg-gray-900">
      <div className="max-w-7xl w-screen mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="w-full h-full">
          {/* Chat interface will be implemented here */}
          <div className="text-white p-4">
            Chat Interface (Coming Soon)
          </div>
        </div>
      </div>
    </div>
  );
} 