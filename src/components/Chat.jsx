import { useEffect } from 'react';
import { useChannel } from '../contexts/ChannelContext';
import ChannelList from './ChannelList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { startBotMessageListener } from '../services/botService';

export default function Chat() {
  const { selectedChannel } = useChannel();

  useEffect(() => {
    let unsubscribe;

    // Start the bot message listener
    const setupListener = async () => {
      try {
        unsubscribe = await startBotMessageListener();
      } catch (error) {
        console.error('Error starting bot message listener:', error);
      }
    };

    setupListener();
    
    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

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