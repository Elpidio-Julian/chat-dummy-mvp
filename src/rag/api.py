from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from contextual_response import ContextualResponseGenerator

# Initialize FastAPI app
app = FastAPI(
    title="RAG Chat API",
    description="API for retrieving context-aware responses using RAG",
    version="1.0.0"
)

# Initialize the response generator
response_generator = ContextualResponseGenerator()

class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    query: str = Field(..., description="The user's question")
    max_context: Optional[int] = Field(5, description="Maximum number of context messages to include")
    use_cache: Optional[bool] = Field(True, description="Whether to use response caching")

class Message(BaseModel):
    """Model for chat messages."""
    content: str
    channel_id: str
    user_name: str
    timestamp: str
    message_id: str

class QueryResponse(BaseModel):
    """Response model for query endpoint."""
    answer: str
    context: List[Dict[str, Any]]
    timestamp: str
    query: str
    cached: bool

class CacheStats(BaseModel):
    """Model for cache statistics."""
    hits: int
    misses: int
    expired: int
    errors: int

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "RAG Chat API",
        "version": "1.0.0",
        "endpoints": [
            "/query - Get contextual responses",
            "/cache/stats - Get cache statistics",
            "/cache/clear - Clear expired cache entries"
        ]
    }

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Get a contextual response for a query.
    
    Args:
        request (QueryRequest): The query request containing:
            - query: The user's question
            - max_context: Maximum number of context messages (optional)
            - use_cache: Whether to use caching (optional)
    
    Returns:
        QueryResponse: The response containing:
            - answer: The generated response
            - context: List of relevant messages used
            - timestamp: When the response was generated
            - query: The original query
            - cached: Whether this was a cached response
    """
    try:
        response = response_generator.generate_response(
            query=request.query,
            max_context=request.max_context,
            use_cache=request.use_cache
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cache/stats", response_model=CacheStats)
async def get_cache_stats():
    """
    Get current cache statistics.
    
    Returns:
        CacheStats: Current cache statistics including:
            - hits: Number of cache hits
            - misses: Number of cache misses
            - expired: Number of expired entries encountered
            - errors: Number of cache errors
    """
    try:
        return response_generator.get_cache_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cache/clear")
async def clear_cache():
    """
    Clear expired cache entries.
    
    Returns:
        dict: Information about the cleanup operation
    """
    try:
        cleared_count, stats = response_generator.clear_cache()
        return {
            "cleared_entries": cleared_count,
            "current_stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 