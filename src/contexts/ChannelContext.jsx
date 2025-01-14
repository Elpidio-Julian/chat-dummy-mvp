import { createContext, useContext, useState } from 'react';

const ChannelContext = createContext();

export function useChannel() {
  return useContext(ChannelContext);
}

export function ChannelProvider({ children }) {
  const [selectedChannel, setSelectedChannel] = useState(null);

  const value = {
    selectedChannel,
    setSelectedChannel
  };

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
} 