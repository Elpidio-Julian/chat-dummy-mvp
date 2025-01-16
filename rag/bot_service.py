import os
import time
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase Admin with service account
cred = credentials.Certificate('credentials/firebase-credentials.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Constants
HELP_CHANNEL_ID = 'help'
BOT_USER_ID = os.getenv('BOT_USER_ID')
PROCESSED_MESSAGES = set()

def send_bot_message(content, channel_id=HELP_CHANNEL_ID):
    """Send a message as the bot."""
    try:
        messages_ref = db.collection('messages').document(channel_id).collection('messages')
        messages_ref.add({
            'content': content,
            'userId': BOT_USER_ID,
            'userName': 'RAG Assistant',
            'createdAt': datetime.now(),
            'isBot': True
        })
    except Exception as e:
        print(f"Error sending bot message: {e}")
        raise e

def send_bot_response(query, response):
    """Send a bot response for a query."""
    try:
        # Send typing indicator
        send_bot_message("_Thinking..._")
        
        # Send the actual response
        send_bot_message(response)
    except Exception as e:
        print(f"Error sending bot response: {e}")
        send_bot_message("Sorry, I encountered an error processing your request. Please try again later.")

def process_message(message_id, message_data):
    """Process a single message and generate bot response."""
    if message_id in PROCESSED_MESSAGES:
        return
    
    PROCESSED_MESSAGES.add(message_id)
    
    # Cleanup old message IDs (keep last 1000)
    if len(PROCESSED_MESSAGES) > 1000:
        PROCESSED_MESSAGES.clear()
        PROCESSED_MESSAGES.add(message_id)
    
    try:
        # Send typing indicator
        send_bot_message("_Thinking..._")
        
        # Extract query (remove "Hey Chatbot" prefix)
        query = message_data['content'][11:].strip()
        
        # Get response from RAG API
        response = query_rag(query)
        
        # Send response
        send_bot_message(response['answer'])
    except Exception as e:
        print(f"Error processing message: {e}")
        send_bot_message("Sorry, I encountered an error processing your request. Please try again later.")

def on_snapshot(doc_snapshot, changes, read_time):
    """Handle new messages in the help channel."""
    for change in changes:
        if change.type.name == 'ADDED':
            message_data = change.document.to_dict()
            
            # Check if message starts with "Hey Chatbot" and isn't from the bot
            if (message_data.get('content', '').lower().startswith('hey chatbot') and
                message_data.get('userId') != BOT_USER_ID and
                '_Thinking..._' not in message_data.get('content', '')):
                process_message(change.document.id, message_data)

def main():
    """Main bot service function."""
    print("Starting bot service...")
    
    # Create a reference to the help channel messages
    help_messages_ref = db.collection('messages').document(HELP_CHANNEL_ID).collection('messages')
    
    # Create query for new messages
    query = help_messages_ref.where('createdAt', '>=', datetime.now())
    
    # Watch the query
    watch = query.on_snapshot(on_snapshot)
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down bot service...")
        watch.unsubscribe()

if __name__ == "__main__":
    main() 