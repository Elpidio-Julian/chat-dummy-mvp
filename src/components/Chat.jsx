import { useChannel } from '../contexts/ChannelContext';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function Chat() {
  const { selectedChannel } = useChannel();

  return (
    <div className="min-h-[calc(100vh-4rem)] min-w-screen bg-gray-900 flex">
      {/* Channel Selection Sidebar */}
      <ChannelList />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedChannel ? (
          <div className="flex-1 flex items-center justify-center bg-gray-800 text-gray-400">
            Select a channel to start chatting
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">#{selectedChannel.name}</h2>
              {selectedChannel.description && (
                <p className="text-sm text-gray-400 mt-1">{selectedChannel.description}</p>
              )}
            </div>
            
            <MessageList channelId={selectedChannel.id} />
            <MessageInput channelId={selectedChannel.id} />
          </>
        )}
      </div>
    </div>
  );
} 