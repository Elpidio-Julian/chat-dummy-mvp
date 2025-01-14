import { useAuth } from '../contexts/AuthContext';
import ChannelList from './ChannelList';

export default function Chat() {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] min-w-screen bg-gray-900 flex">
      {/* Sidebar */}
      <ChannelList />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4">
          <div className="text-white">
            Select a channel to start chatting
          </div>
        </div>
      </div>
    </div>
  );
} 