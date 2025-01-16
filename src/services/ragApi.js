/**
 * RAG API Client Service
 * Handles communication with the local RAG API endpoint
 */

const API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';

/**
 * Send a query to the RAG API
 * @param {string} query - The user's question
 * @param {Object} options - Additional options
 * @param {number} options.maxContext - Maximum number of context messages (default: 5)
 * @param {boolean} options.useCache - Whether to use response caching (default: true)
 * @param {boolean} options.sendToChat - Whether to send response to chat (default: false)
 * @param {string} options.channelId - The channel ID to send the response to (default: 'help')
 * @returns {Promise<Object>} The API response
 */
export const queryRagApi = async (query, options = {}) => {
    const { 
        maxContext = 5, 
        useCache = true, 
        sendToChat = false,
        channelId = 'help'
    } = options;

    try {
        const response = await fetch(`${API_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                max_context: maxContext,
                use_cache: useCache,
                send_to_chat: sendToChat,
                channel_id: channelId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get response from RAG API');
        }

        return response.json();
    } catch (error) {
        console.error('RAG API Error:', error);
        throw error;
    }
};

/**
 * Get current cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export const getCacheStats = async () => {
    try {
        const response = await fetch(`${API_URL}/cache/stats`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get cache stats');
        }

        return response.json();
    } catch (error) {
        console.error('Cache Stats Error:', error);
        throw error;
    }
};

/**
 * Clear expired cache entries
 * @returns {Promise<Object>} Cleanup operation results
 */
export const clearExpiredCache = async () => {
    try {
        const response = await fetch(`${API_URL}/cache/clear`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to clear cache');
        }

        return response.json();
    } catch (error) {
        console.error('Cache Clear Error:', error);
        throw error;
    }
}; 