import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useChannel } from '../contexts/ChannelContext';

export default function PublicChannelBrowser({ onClose }) {
  const [publicChannels, setPublicChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinedChannelIds, setJoinedChannelIds] = useState(new Set());
  const { currentUser } = useAuth();
  const { setSelectedChannel } = useChannel();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Fetch public channels
        const channelsRef = collection(db, 'channels');
        const q = query(channelsRef, where('isPublic', '==', true));
        const snapshot = await getDocs(q);
        
        const channels = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch user's joined channels
        const joinedIds = new Set();
        await Promise.all(channels.map(async (channel) => {
          const memberRef = doc(db, 'channelMembers', channel.id, 'members', currentUser.uid);
          const memberDoc = await getDoc(memberRef);
          if (memberDoc.exists()) {
            joinedIds.add(channel.id);
          }
        }));
        
        setJoinedChannelIds(joinedIds);
        setPublicChannels(channels);
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [currentUser.uid]);

  const handleJoinChannel = async (channel) => {
    try {
      setJoining(channel.id);
      const memberRef = doc(db, 'channelMembers', channel.id, 'members', currentUser.uid);
      await setDoc(memberRef, {
        userId: currentUser.uid,
        role: 'member',
        joinedAt: new Date()
      });
      
      setJoinedChannelIds(prev => new Set([...prev, channel.id]));
      setSelectedChannel(channel);
      onClose();
    } catch (error) {
      console.error('Error joining channel:', error);
      setJoining(null);
    }
  };

  const filteredChannels = publicChannels
    .filter(channel => !joinedChannelIds.has(channel.id))
    .filter(channel => 
      searchTerm === '' || 
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-gray-400">Loading public channels...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Public Channels</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search channels..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
      
      {filteredChannels.length === 0 ? (
        <div className="text-gray-400">
          {searchTerm ? 'No matching channels found' : 'No available channels to join'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChannels.map(channel => (
            <div
              key={channel.id}
              className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">#{channel.name}</h4>
                  {channel.description && (
                    <p className="text-sm text-gray-400">{channel.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleJoinChannel(channel)}
                  disabled={joining === channel.id}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {joining === channel.id ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 