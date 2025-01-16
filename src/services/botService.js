/**
 * Bot Service
 * Handles bot interactions with Firebase
 */

import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    connectAuthEmulator
} from 'firebase/auth';
import { 
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    Timestamp,
    connectFirestoreEmulator,
    doc,
    updateDoc,
    runTransaction
} from 'firebase/firestore';
import { queryRagApi } from './ragApi';

// Bot configuration from environment
const BOT_USER_ID = import.meta.env.VITE_BOT_USER_ID;
const BOT_EMAIL = import.meta.env.VITE_BOT_EMAIL;
const BOT_PASSWORD = import.meta.env.VITE_BOT_PASSWORD;

// Initialize a separate Firebase app instance for the bot
const botFirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Create a separate app instance for the bot
const botApp = initializeApp(botFirebaseConfig, 'botApp');
const botAuth = getAuth(botApp);
const botDb = getFirestore(botApp);

// Message queue to prevent race conditions
let messageQueue = Promise.resolve();

// Set to track processed message IDs
const processedMessages = new Set();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise<any>}
 */
const retry = async (fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed:`, error);
            
            if (i < maxRetries - 1) {
                const waitTime = delay * Math.pow(2, i);
                console.log(`Retrying in ${waitTime}ms...`);
                await sleep(waitTime);
            }
        }
    }
    
    throw lastError;
};

/**
 * Send a message as the bot
 * @param {string} content - Message content
 * @param {string} channelId - Target channel ID
 * @returns {Promise<void>}
 */
export const sendBotMessage = async (content, channelId = 'help') => {
    const sendMessage = async () => {
        await addDoc(collection(botDb, 'messages', channelId, 'messages'), {
            content,
            userId: BOT_USER_ID,
            userName: 'RAG Assistant',
            createdAt: serverTimestamp(),
            isBot: true
        });
    };

    try {
        await retry(sendMessage);
    } catch (error) {
        console.error('Error sending bot message:', error);
        throw error;
    }
};

/**
 * Process a user message and generate a bot response
 * @param {Object} message - The message object
 * @param {string} messageId - The message ID
 * @returns {Promise<void>}
 */
export const processBotQuery = async (message, messageId) => {
    // Check if message was already processed
    if (processedMessages.has(messageId)) {
        return;
    }
    
    // Add message to processed set
    processedMessages.add(messageId);
    
    // Cleanup old message IDs (keep last 1000)
    if (processedMessages.size > 1000) {
        const idsToRemove = Array.from(processedMessages).slice(0, processedMessages.size - 1000);
        idsToRemove.forEach(id => processedMessages.delete(id));
    }

    // Add to message queue to prevent race conditions
    messageQueue = messageQueue.then(async () => {
        try {
            // Send typing indicator
            await sendBotMessage("_Thinking..._");
            
            // Extract query (remove "Hey Chatbot" prefix)
            const query = message.content.slice(11).trim();
            
            // Get response from RAG API with retry
            const response = await retry(() => queryRagApi(query));
            
            // Remove typing indicator and send actual response
            await sendBotMessage(response.answer);
        } catch (error) {
            console.error('Error processing bot query:', error);
            await sendBotMessage('Sorry, I encountered an error processing your request. Please try again later.');
        }
    });

    return messageQueue;
};

/**
 * Try to claim a message for processing
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID
 * @returns {Promise<boolean>} Whether the claim was successful
 */
const tryClaimMessage = async (channelId, messageId) => {
    try {
        const messageRef = doc(botDb, 'messages', channelId, 'messages', messageId);
        
        // Try to update the message with processing status
        const result = await runTransaction(botDb, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) return false;
            
            const messageData = messageDoc.data();
            if (messageData.isProcessed || messageData.isProcessing) return false;
            
            transaction.update(messageRef, {
                isProcessing: true,
                processingStartedAt: serverTimestamp()
            });
            return true;
        });
        
        return result;
    } catch (error) {
        console.error('Error claiming message:', error);
        return false;
    }
};

/**
 * Mark a message as processed
 * @param {string} channelId - The channel ID
 * @param {string} messageId - The message ID
 */
const markMessageProcessed = async (channelId, messageId) => {
    try {
        const messageRef = doc(botDb, 'messages', channelId, 'messages', messageId);
        await updateDoc(messageRef, {
            isProcessed: true,
            isProcessing: false,
            processedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error marking message as processed:', error);
    }
};

/**
 * Start listening for messages in the help channel
 * @returns {Function} Unsubscribe function
 */
export const startBotMessageListener = async () => {
    let retryCount = 0;
    const maxRetries = MAX_RETRIES;

    while (retryCount < maxRetries) {
        try {
            // Sign in the bot
            await signInWithEmailAndPassword(botAuth, BOT_EMAIL, BOT_PASSWORD);
            console.log('Bot authenticated successfully');

            // Get current timestamp for filtering
            const startTime = Timestamp.now();

            // Query for new messages in help channel
            const messagesRef = collection(botDb, 'messages', 'help', 'messages');
            const q = query(
                messagesRef,
                where('createdAt', '>=', startTime),
                orderBy('createdAt', 'asc')
            );

            // Subscribe to new messages
            return onSnapshot(q, async (snapshot) => {
                const changes = snapshot.docChanges();
                
                for (const change of changes) {
                    if (change.type === 'added') {
                        const messageId = change.doc.id;
                        const message = change.doc.data();
                        
                        if (
                            message.content.toLowerCase().startsWith('hey chatbot') &&
                            message.userId !== BOT_USER_ID &&
                            !message.content.includes('_Thinking..._') && // Ignore typing indicators
                            !message.isProcessed && // Skip if already processed
                            !message.isProcessing // Skip if being processed
                        ) {
                            // Try to claim the message for processing
                            const claimed = await tryClaimMessage('help', messageId);
                            if (claimed) {
                                try {
                                    await processBotQuery(message, messageId);
                                    await markMessageProcessed('help', messageId);
                                } catch (error) {
                                    console.error('Error processing message:', error);
                                }
                            }
                        }
                    }
                }
            }, error => {
                console.error('Snapshot listener error:', error);
                // Listener will automatically retry on error
            });
        } catch (error) {
            console.error(`Bot initialization attempt ${retryCount + 1} failed:`, error);
            retryCount++;
            
            if (retryCount < maxRetries) {
                const delay = RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`Retrying in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw new Error('Failed to initialize bot after multiple retries');
            }
        }
    }
};

/**
 * Initialize the bot service
 * @returns {Promise<Function>} Cleanup function
 */
export const initializeBotService = async () => {
    try {
        // Start listening for messages with retry
        const unsubscribe = await retry(() => startBotMessageListener());
        
        // Return cleanup function
        return () => {
            unsubscribe();
            processedMessages.clear();
        };
    } catch (error) {
        console.error('Error initializing bot service:', error);
        throw error;
    }
}; 