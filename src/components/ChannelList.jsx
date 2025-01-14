import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChannel } from '../contexts/ChannelContext';
import CreateChannelModal from './CreateChannelModal';
import PublicChannelBrowser from './PublicChannelBrowser';

export default function ChannelList() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const { currentUser } = useAuth();
  const { selectedChannel, setSelectedChannel } = useChannel();

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
        const filteredChannels = userChannels.filter(channel => channel !== null);
        setChannels(filteredChannels);

        // If no channel is selected and we have channels, select the first one
        if (!selectedChannel && filteredChannels.length > 0) {
          setSelectedChannel(filteredChannels[0]);
        }

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
  }, [currentUser, selectedChannel, setSelectedChannel]);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  return (
    <div className="w-64 bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Channels</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowBrowser(true)}
          className="w-full px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Browse Channels
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-gray-400">Loading channels...</div>
      ) : channels.length === 0 ? (
        <div className="p-4 text-gray-400">No channels yet</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full p-3 text-left hover:bg-gray-700 ${
                selectedChannel?.id === channel.id ? 'bg-gray-700' : ''
              }`}
            >
              <span className="text-gray-400">#</span>
              <span className="text-gray-200 ml-1">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateChannelModal onClose={() => setShowCreateModal(false)} />
      )}

      {showBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <PublicChannelBrowser onClose={() => setShowBrowser(false)} />
          </div>
        </div>
      )}
    </div>
  );
} 