import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import CreateChannelModal from './CreateChannelModal';

export default function ChannelList() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to channels collection
    const channelsRef = collection(db, 'channels');
    const channelsQuery = query(channelsRef);

    const unsubscribe = onSnapshot(channelsQuery, async (channelSnapshot) => {
      try {
        // Get all channels first
        const allChannels = channelSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // For each channel, check if the user is a member
        const userChannels = await Promise.all(
          allChannels.map(async (channel) => {
            const memberRef = collection(db, 'channelMembers', channel.id, 'members');
            const memberQuery = query(memberRef, where('userId', '==', currentUser.uid));
            const memberSnapshot = await getDocs(memberQuery);
            
            // Only include channels where the user is a member
            if (!memberSnapshot.empty) {
              return channel;
            }
            return null;
          })
        );

        // Filter out null values and set channels
        setChannels(userChannels.filter(channel => channel !== null));
        setLoading(false);
      } catch (error) {
        console.error("Error fetching channels:", error);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in channel subscription:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <>
      <div className="w-64 bg-gray-800 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-white font-semibold">Channels</h2>
            <button
              className="p-1 hover:bg-gray-700 rounded"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-gray-400 p-4">Loading channels...</div>
          ) : channels.length === 0 ? (
            <div className="text-gray-400 p-4">No channels yet</div>
          ) : (
            <ul className="space-y-1 p-2">
              {channels.map(channel => (
                <li key={channel.id}>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
                    onClick={() => {/* TODO: Implement channel selection */}}
                  >
                    # {channel.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CreateChannelModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
} 